import Foundation

@MainActor
final class WindowsService: ObservableObject {
    @Published var windows: CognitiveWindowsResponse?
    @Published var message = ""

    private let api = APIClient.shared

    func loadToday() async {
        do {
            windows = try await api.get(APIConfig.windowsEndpoint.appendingPathComponent("today"))
            message = "Confidence: \(Int((windows?.confidence ?? 0) * 100))%"
        } catch {
            message = "Windows unavailable: \(error.localizedDescription)"
        }
    }
}
