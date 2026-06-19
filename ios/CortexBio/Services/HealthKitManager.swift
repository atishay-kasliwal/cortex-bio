import Foundation
import HealthKit

@MainActor
final class HealthKitManager: ObservableObject {
    private let store = HKHealthStore()

    @Published var authorizationStatus = "Not requested"
    @Published var isAuthorized = false

    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()
        types.insert(HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!)
        types.insert(HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!)
        types.insert(HKObjectType.quantityType(forIdentifier: .restingHeartRate)!)
        types.insert(HKObjectType.quantityType(forIdentifier: .heartRate)!)
        types.insert(HKObjectType.quantityType(forIdentifier: .stepCount)!)
        types.insert(HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!)
        types.insert(HKObjectType.quantityType(forIdentifier: .appleExerciseTime)!)
        types.insert(HKObjectType.workoutType())
        return types
    }

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationStatus = "HealthKit unavailable on this device"
            return
        }

        do {
            try await store.requestAuthorization(toShare: [], read: readTypes)
            isAuthorized = true
            authorizationStatus = "Authorized"
        } catch {
            authorizationStatus = "Authorization failed: \(error.localizedDescription)"
        }
    }

    func buildSyncPayload(days: Int = 1) async throws -> SyncPayload {
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -days, to: end) ?? end

        async let hrv = fetchQuantitySamples(
            identifier: .heartRateVariabilitySDNN,
            metricType: "hrv",
            unit: HKUnit.secondUnit(with: .milli),
            start: start,
            end: end
        )
        async let restingHR = fetchQuantitySamples(
            identifier: .restingHeartRate,
            metricType: "resting_heart_rate",
            unit: HKUnit.count().unitDivided(by: .minute()),
            start: start,
            end: end
        )
        async let heartRate = fetchQuantitySamples(
            identifier: .heartRate,
            metricType: "heart_rate",
            unit: HKUnit.count().unitDivided(by: .minute()),
            start: start,
            end: end
        )
        async let steps = fetchQuantitySamples(
            identifier: .stepCount,
            metricType: "steps",
            unit: HKUnit.count(),
            start: start,
            end: end
        )
        async let energy = fetchQuantitySamples(
            identifier: .activeEnergyBurned,
            metricType: "active_energy",
            unit: HKUnit.kilocalorie(),
            start: start,
            end: end
        )
        async let exercise = fetchQuantitySamples(
            identifier: .appleExerciseTime,
            metricType: "exercise_minutes",
            unit: HKUnit.minute(),
            start: start,
            end: end
        )
        async let sleep = fetchSleepSessions(start: start, end: end)
        async let workouts = fetchWorkouts(start: start, end: end)

        let samples = try await hrv + restingHR + heartRate + steps + energy + exercise
        return SyncPayload(
            email: nil,
            samples: samples,
            sleepSessions: try await sleep,
            workouts: try await workouts,
            timezone: TimeZone.current.identifier
        )
    }

    private func fetchQuantitySamples(
        identifier: HKQuantityTypeIdentifier,
        metricType: String,
        unit: HKUnit,
        start: Date,
        end: Date
    ) async throws -> [HealthSamplePayload] {
        let type = HKQuantityType.quantityType(forIdentifier: identifier)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let payloads = (samples as? [HKQuantitySample] ?? []).map { sample in
                    HealthSamplePayload(
                        metricType: metricType,
                        value: sample.quantity.doubleValue(for: unit),
                        unit: unit.unitString,
                        startTime: sample.startDate,
                        endTime: sample.endDate,
                        sourceDevice: sample.sourceRevision.source.name,
                        metadata: [:]
                    )
                }
                continuation.resume(returning: payloads)
            }
            self.store.execute(query)
        }
    }

    private func fetchSleepSessions(start: Date, end: Date) async throws -> [SleepSessionPayload] {
        let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: type,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let categorySamples = (samples as? [HKCategorySample] ?? [])
                let grouped = Dictionary(grouping: categorySamples) { sample in
                    Calendar.current.startOfDay(for: sample.endDate)
                }

                var sessions: [SleepSessionPayload] = []

                for (_, daySamples) in grouped {
                    guard let sessionStart = daySamples.map(\.startDate).min(),
                          let sessionEnd = daySamples.map(\.endDate).max() else { continue }

                    var deep: Double = 0
                    var rem: Double = 0
                    var core: Double = 0
                    var awake: Double = 0
                    var inBed: Double = 0

                    for sample in daySamples {
                        let minutes = sample.endDate.timeIntervalSince(sample.startDate) / 60.0
                        switch sample.value {
                        case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
                            deep += minutes
                        case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                            rem += minutes
                        case HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                             HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                            core += minutes
                        case HKCategoryValueSleepAnalysis.awake.rawValue:
                            awake += minutes
                        case HKCategoryValueSleepAnalysis.inBed.rawValue:
                            inBed += minutes
                        default:
                            break
                        }
                    }

                    let asleep = deep + rem + core
                    let duration = max(asleep, sessionEnd.timeIntervalSince(sessionStart) / 60.0)
                    let inBedMinutes = max(inBed, duration + awake)

                    sessions.append(
                        SleepSessionPayload(
                            sleepStart: sessionStart,
                            sleepEnd: sessionEnd,
                            durationMinutes: duration,
                            remMinutes: rem,
                            deepMinutes: deep,
                            coreMinutes: core,
                            awakeMinutes: awake,
                            sourceDevice: daySamples.first?.sourceRevision.source.name
                        )
                    )

                    _ = inBedMinutes
                }

                continuation.resume(returning: sessions)
            }
            self.store.execute(query)
        }
    }

    private func fetchWorkouts(start: Date, end: Date) async throws -> [WorkoutPayload] {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let payloads = (samples as? [HKWorkout] ?? []).map { workout in
                    WorkoutPayload(
                        workoutType: workout.workoutActivityType.name,
                        startTime: workout.startDate,
                        endTime: workout.endDate,
                        durationMinutes: workout.duration / 60.0,
                        calories: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                        avgHeartRate: nil,
                        sourceDevice: workout.sourceRevision.source.name
                    )
                }
                continuation.resume(returning: payloads)
            }
            self.store.execute(query)
        }
    }
}

private extension HKWorkoutActivityType {
    var name: String {
        String(describing: self)
    }
}
