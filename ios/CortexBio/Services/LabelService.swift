import Foundation

@MainActor
final class LabelService: ObservableObject {
    @Published var progress: LabelProgress?
    @Published var message = ""
    @Published var productivity = 3.0
    @Published var energy = 3.0
    @Published var focus = 3.0
    @Published var mood = 3.0
    @Published var notes = ""

    private let api = APIClient.shared

    func loadProgress() async {
        do {
            progress = try await api.get(APIConfig.labelsEndpoint.appendingPathComponent("progress"))
        } catch {
            message = "Could not load progress"
        }
    }

    func saveToday() async {
        let today = api.todayDateKey()
        let url = APIConfig.labelsEndpoint.appendingPathComponent(today)
        let input = DailyLabelInput(
            productivityScore: Int(productivity),
            energyScore: Int(energy),
            focusScore: Int(focus),
            moodScore: Int(mood),
            notes: notes.isEmpty ? nil : notes
        )

        do {
            struct SaveResponse: Codable {}
            _ = try await api.put(url, body: input) as SaveResponse
            message = "Saved today's label"
            await loadProgress()
        } catch {
            message = "Save failed: \(error.localizedDescription)"
        }
    }
}
