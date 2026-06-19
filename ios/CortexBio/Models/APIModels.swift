import Foundation

enum APIConfig {
    static let baseURL = URL(string: "http://localhost:8000")!
    static let syncEndpoint = baseURL.appendingPathComponent("api/sync")
    static let labelsEndpoint = baseURL.appendingPathComponent("api/labels")
    static let sessionsEndpoint = baseURL.appendingPathComponent("api/sessions")
    static let analyticsEndpoint = baseURL.appendingPathComponent("api/analytics")
    static let windowsEndpoint = baseURL.appendingPathComponent("api/windows")
    static let forecastEndpoint = baseURL.appendingPathComponent("api/forecast")
    static let predictionsEndpoint = baseURL.appendingPathComponent("api/predictions")
    static let mlEndpoint = baseURL.appendingPathComponent("api/ml")
    static let validationEndpoint = baseURL.appendingPathComponent("api/validation")
}

// MARK: - Sync

struct HealthSamplePayload: Codable {
    let metricType: String
    let value: Double
    let unit: String?
    let startTime: Date
    let endTime: Date?
    let sourceDevice: String?
    let metadata: [String: String]

    enum CodingKeys: String, CodingKey {
        case metricType = "metric_type"
        case value, unit
        case startTime = "start_time"
        case endTime = "end_time"
        case sourceDevice = "source_device"
        case metadata
    }
}

struct SleepSessionPayload: Codable {
    let sleepStart: Date
    let sleepEnd: Date
    let durationMinutes: Double
    let remMinutes: Double
    let deepMinutes: Double
    let coreMinutes: Double
    let awakeMinutes: Double
    let sourceDevice: String?

    enum CodingKeys: String, CodingKey {
        case sleepStart = "sleep_start"
        case sleepEnd = "sleep_end"
        case durationMinutes = "duration_minutes"
        case remMinutes = "rem_minutes"
        case deepMinutes = "deep_minutes"
        case coreMinutes = "core_minutes"
        case awakeMinutes = "awake_minutes"
        case sourceDevice = "source_device"
    }
}

struct WorkoutPayload: Codable {
    let workoutType: String
    let startTime: Date
    let endTime: Date
    let durationMinutes: Double
    let calories: Double?
    let avgHeartRate: Double?
    let sourceDevice: String?

    enum CodingKeys: String, CodingKey {
        case workoutType = "workout_type"
        case startTime = "start_time"
        case endTime = "end_time"
        case durationMinutes = "duration_minutes"
        case calories
        case avgHeartRate = "avg_heart_rate"
        case sourceDevice = "source_device"
    }
}

struct SyncPayload: Codable {
    let email: String?
    let samples: [HealthSamplePayload]
    let sleepSessions: [SleepSessionPayload]
    let workouts: [WorkoutPayload]
    let timezone: String

    enum CodingKeys: String, CodingKey {
        case email, samples
        case sleepSessions = "sleep_sessions"
        case workouts, timezone
    }
}

struct SyncResponse: Codable {
    let samplesInserted: Int
    let featuresComputedFor: [String]

    enum CodingKeys: String, CodingKey {
        case samplesInserted = "samples_inserted"
        case featuresComputedFor = "features_computed_for"
    }
}

struct DailyFeatureDetail: Codable {
    let sleepDuration: Double?
    let avgHrv: Double?
    let hrvVsBaselinePct: Double?
    let restingHr: Double?
    let steps: Double?
    let featureConfidence: Double?
}

struct DailyFeatureResponse: Codable {
    let dailyFeature: DailyFeatureDetail
    enum CodingKeys: String, CodingKey { case dailyFeature = "daily_feature" }
}

// MARK: - Labels

struct DailyLabelInput: Codable {
    let productivityScore: Int
    let energyScore: Int
    let focusScore: Int
    let moodScore: Int
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case productivityScore = "productivity_score"
        case energyScore = "energy_score"
        case focusScore = "focus_score"
        case moodScore = "mood_score"
        case notes
    }
}

struct LabelProgress: Codable {
    let dailyLabels: Int
    let completedSessions: Int
    let goalDailyLabels: Int
    let goalSessions: Int
    let dailyLabelsPct: Int
    let sessionsPct: Int
    let phase1Complete: Bool

    enum CodingKeys: String, CodingKey {
        case dailyLabels = "daily_labels"
        case completedSessions = "completed_sessions"
        case goalDailyLabels = "goal_daily_labels"
        case goalSessions = "goal_sessions"
        case dailyLabelsPct = "daily_labels_pct"
        case sessionsPct = "sessions_pct"
        case phase1Complete = "phase_1_complete"
    }
}

// MARK: - Sessions

struct WorkSession: Codable, Identifiable {
    let id: String
    let startedAt: Date
    let endedAt: Date?
    let projectName: String?
    let sessionQuality: String?
    let durationMinutes: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case startedAt = "startedAt"
        case endedAt = "endedAt"
        case projectName = "projectName"
        case sessionQuality = "sessionQuality"
        case durationMinutes = "durationMinutes"
    }
}

struct ActiveSessionResponse: Codable {
    let session: WorkSession?
}

struct StartSessionInput: Codable {
    let projectName: String
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case projectName = "project_name"
        case notes
    }
}

struct EndSessionInput: Codable {
    let sessionQuality: String
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case sessionQuality = "session_quality"
        case notes
    }
}

// MARK: - Analytics

struct CorrelationReport: Codable, Identifiable {
    var id: String { "\(featureLabel)-\(outcomeLabel)" }
    let featureLabel: String
    let outcomeLabel: String
    let correlation: Double
    let sampleCount: Int
    let sufficient: Bool

    enum CodingKeys: String, CodingKey {
        case featureLabel = "featureLabel"
        case outcomeLabel = "outcomeLabel"
        case correlation, sampleCount, sufficient
    }
}

struct CorrelationsResponse: Codable {
    let correlations: [CorrelationRow]

    struct CorrelationRow: Codable, Identifiable {
        var id: String { "\(featureLabel)-\(outcomeLabel)" }
        let featureLabel: String
        let outcomeLabel: String
        let correlation: Double
        let sampleCount: Int
        let sufficient: Bool
    }
}

struct Insight: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let impactPct: Double?
    let confidence: Double?

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case impactPct = "impactPct"
        case confidence
    }
}

struct InsightsResponse: Codable {
    let insights: [Insight]
}

let SESSION_TYPES = ["Research", "Coding", "Writing", "Reading", "Meetings"]
let QUALITY_OPTIONS = ["poor", "average", "good", "great"]

struct HourlyScore: Codable, Identifiable {
    var id: Int { hour }
    let hour: Int
    let score: Int
}

struct TimeWindow: Codable {
    let start: String
    let end: String
}

struct CognitiveWindowsResponse: Codable {
    let date: String
    let hourlyCurve: [HourlyScore]
    let peakWindow: TimeWindow?
    let secondaryWindow: TimeWindow?
    let crashWindow: TimeWindow?
    let meetingWindow: TimeWindow?
    let recoveryWindow: TimeWindow?
    let confidence: Double
    let version: String

    enum CodingKeys: String, CodingKey {
        case date
        case hourlyCurve = "hourly_curve"
        case peakWindow = "peak_window"
        case secondaryWindow = "secondary_window"
        case crashWindow = "crash_window"
        case meetingWindow = "meeting_window"
        case recoveryWindow = "recovery_window"
        case confidence, version
    }
}

struct ForecastResponse: Codable {
    let date: String
    let hourlyForecast: [HourlyScore]
    let bestDeepWorkWindow: TimeWindow?
    let bestMeetingWindow: TimeWindow?
    let recoveryWindow: TimeWindow?
    let dailyPrediction: DailyPrediction?
    let version: String

    enum CodingKeys: String, CodingKey {
        case date
        case hourlyForecast = "hourly_forecast"
        case bestDeepWorkWindow = "best_deep_work_window"
        case bestMeetingWindow = "best_meeting_window"
        case recoveryWindow = "recovery_window"
        case dailyPrediction = "daily_prediction"
        case version
    }
}

struct DailyPrediction: Codable {
    let predictedAttention: Double?
    let predictedDeepWork: Double?
    let predictedOutput: Double?
    let confidence: Double?

    enum CodingKeys: String, CodingKey {
        case predictedAttention = "predicted_attention"
        case predictedDeepWork = "predicted_deep_work"
        case predictedOutput = "predicted_output"
        case confidence
    }
}

struct PerformancePredictionResponse: Codable {
    let predictedAttention: Double?
    let predictedDeepWork: Double?
    let predictedOutput: Double?
    let confidence: Double
    let modelVersion: String
    let validated: Bool

    enum CodingKeys: String, CodingKey {
        case predictedAttention = "predicted_attention"
        case predictedDeepWork = "predicted_deep_work"
        case predictedOutput = "predicted_output"
        case confidence
        case modelVersion = "model_version"
        case validated
    }
}

struct TrainResponse: Codable {
    let method: String
    let beatsBaselines: Bool
    let sampleCount: Int

    enum CodingKeys: String, CodingKey {
        case method
        case beatsBaselines = "beats_baselines"
        case sampleCount = "sample_count"
    }
}

// MARK: - Validation (Phase 9)

struct ValidationSummaryResponse: Codable {
    let modelVersion: String
    let validatedDays: Int
    let totalValidations: Int
    let targets: [String: ValidationTargetSummary?]
    let mlAddsValue: Bool
    let dateRange: ValidationDateRange?

    enum CodingKeys: String, CodingKey {
        case modelVersion = "model_version"
        case validatedDays = "validated_days"
        case totalValidations = "total_validations"
        case targets
        case mlAddsValue = "ml_adds_value"
        case dateRange = "date_range"
    }
}

struct ValidationDateRange: Codable {
    let start: String
    let end: String
}

struct ValidationTargetSummary: Codable {
    let mae: Double
    let rmse: Double
    let correlation: Double?
    let beatsBaselines: Bool
    let sampleCount: Int
    let trend: String
    let baselineMae: BaselineMae?

    enum CodingKeys: String, CodingKey {
        case mae, rmse, correlation
        case beatsBaselines = "beats_baselines"
        case sampleCount = "sample_count"
        case trend
        case baselineMae = "baseline_mae"
    }
}

struct BaselineMae: Codable {
    let yesterday: Double?
    let rolling7: Double?
    let readiness: Double?
}

struct ValidationHistoryResponse: Codable {
    let history: [ValidationHistoryRow]
    let accuracyOverTime: [AccuracyOverTimePoint]

    enum CodingKeys: String, CodingKey {
        case history
        case accuracyOverTime = "accuracy_over_time"
    }
}

struct ValidationHistoryRow: Codable, Identifiable {
    var id: String { "\(predictionDate)-\(targetType)" }
    let predictionDate: String
    let targetType: String
    let predictedValue: Double
    let actualValue: Double
    let absoluteError: Double
    let percentageError: Double?
    let modelVersion: String

    enum CodingKeys: String, CodingKey {
        case predictionDate = "prediction_date"
        case targetType = "target_type"
        case predictedValue = "predicted_value"
        case actualValue = "actual_value"
        case absoluteError = "absolute_error"
        case percentageError = "percentage_error"
        case modelVersion = "model_version"
    }
}

struct AccuracyOverTimePoint: Codable, Identifiable {
    var id: String { date }
    let date: String
    let meanAbsoluteError: Double?

    enum CodingKeys: String, CodingKey {
        case date
        case meanAbsoluteError = "mean_absolute_error"
    }
}

struct ValidationFeaturesResponse: Codable {
    let modelVersion: String?
    let featureImportance: [String: [FeatureImportanceRow]]
    let baselineComparison: [String: BaselineComparisonRow]
    let beatsBaselines: Bool

    enum CodingKeys: String, CodingKey {
        case modelVersion = "model_version"
        case featureImportance = "feature_importance"
        case baselineComparison = "baseline_comparison"
        case beatsBaselines = "beats_baselines"
    }
}

struct FeatureImportanceRow: Codable, Identifiable {
    var id: String { feature }
    let feature: String
    let importance: Double
}

struct BaselineComparisonRow: Codable {
    let modelMae: Double?
    let yesterday: Double?
    let rolling7: Double?
    let readiness: Double?
    let beatsBaselines: Bool?

    enum CodingKeys: String, CodingKey {
        case modelMae = "model_mae"
        case yesterday, rolling7, readiness
        case beatsBaselines = "beats_baselines"
    }
}
