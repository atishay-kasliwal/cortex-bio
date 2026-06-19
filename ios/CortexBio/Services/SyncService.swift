import Foundation

@MainActor
final class SyncService: ObservableObject {
    @Published var lastSyncMessage = "Not synced yet"
    @Published var isSyncing = false
    @Published var todayFeatures: DailyFeatureDetail?

    private let api = APIClient.shared

    func sync(payload: SyncPayload) async throws {
        isSyncing = true
        defer { isSyncing = false }

        let response: SyncResponse = try await api.post(APIConfig.syncEndpoint, body: payload)
        lastSyncMessage = "Inserted \(response.samplesInserted) samples. Features: \(response.featuresComputedFor.joined(separator: ", "))"
        try await fetchTodayFeatures()
    }

    func fetchTodayFeatures() async throws {
        let today = api.todayDateKey()
        let url = APIConfig.baseURL.appendingPathComponent("api/features/daily/\(today)")
        do {
            let response: DailyFeatureResponse = try await api.get(url)
            todayFeatures = response.dailyFeature
        } catch {
            todayFeatures = nil
        }
    }
}
