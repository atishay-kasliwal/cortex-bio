import Foundation

@MainActor
final class SessionService: ObservableObject {
    @Published var activeSession: WorkSession?
    @Published var message = ""
    @Published var selectedType = "Coding"
    @Published var selectedQuality = "good"

    private let api = APIClient.shared

    func refreshActive() async {
        do {
            let response: ActiveSessionResponse = try await api.get(
                APIConfig.sessionsEndpoint.appendingPathComponent("active")
            )
            activeSession = response.session
        } catch {
            message = "Could not load session"
        }
    }

    func startSession() async {
        let input = StartSessionInput(projectName: selectedType, notes: nil)
        do {
            struct SessionResponse: Codable { let session: WorkSession }
            let response: SessionResponse = try await api.post(APIConfig.sessionsEndpoint, body: input)
            activeSession = response.session
            message = "Session started: \(selectedType)"
        } catch {
            message = "Start failed: \(error.localizedDescription)"
        }
    }

    func endSession() async {
        guard let session = activeSession else { return }
        let url = APIConfig.sessionsEndpoint.appendingPathComponent("\(session.id)/end")
        let input = EndSessionInput(sessionQuality: selectedQuality, notes: nil)

        do {
            struct SessionResponse: Codable { let session: WorkSession }
            _ = try await api.patch(url, body: input) as SessionResponse
            activeSession = nil
            message = "Session ended: \(selectedQuality)"
        } catch {
            message = "End failed: \(error.localizedDescription)"
        }
    }
}
