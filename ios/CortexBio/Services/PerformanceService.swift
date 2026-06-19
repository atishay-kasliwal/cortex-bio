import Foundation

@MainActor
final class PerformanceService: ObservableObject {
    @Published var prediction: PerformancePredictionResponse?
    @Published var message = ""

    private let api = APIClient.shared

    func loadTomorrow() async {
        do {
            prediction = try await api.get(APIConfig.predictionsEndpoint.appendingPathComponent("tomorrow"))
            if prediction?.validated == true {
                message = "Validated model"
            } else {
                message = "Model below baseline — not production-ready"
            }
        } catch {
            message = "Train model first (POST /api/ml/train)"
        }
    }

    func trainModel() async {
        do {
            let result: TrainResponse = try await api.post(APIConfig.mlEndpoint.appendingPathComponent("train"))
            message = result.beatsBaselines
                ? "Trained (\(result.method)) — beats baselines"
                : "Trained (\(result.method)) — below baseline"
            await loadTomorrow()
        } catch {
            message = "Training failed: \(error.localizedDescription)"
        }
    }
}
