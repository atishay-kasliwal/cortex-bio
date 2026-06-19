import Foundation

@MainActor
final class ValidationService: ObservableObject {
    @Published var summary: ValidationSummaryResponse?
    @Published var history: ValidationHistoryResponse?
    @Published var features: ValidationFeaturesResponse?
    @Published var message = ""

    private let api = APIClient.shared

    func loadAll() async {
        await loadSummary()
        await loadHistory()
        await loadFeatures()
    }

    func loadSummary() async {
        do {
            summary = try await api.get(APIConfig.validationEndpoint.appendingPathComponent("summary"))
            if let adds = summary?.mlAddsValue {
                message = adds ? "ML outperforms baselines" : "ML below baseline heuristics"
            }
        } catch {
            message = "No validation data yet"
        }
    }

    func loadHistory() async {
        do {
            history = try await api.get(APIConfig.validationEndpoint.appendingPathComponent("history"))
        } catch {
            message = "Failed to load history"
        }
    }

    func loadFeatures() async {
        do {
            features = try await api.get(APIConfig.validationEndpoint.appendingPathComponent("features"))
        } catch {
            message = "Failed to load features"
        }
    }

    func recompute() async {
        do {
            struct ComputeResult: Decodable {
                let validated: Int
                let metricsUpdated: Int
                enum CodingKeys: String, CodingKey {
                    case validated
                    case metricsUpdated = "metrics_updated"
                }
            }
            let _: ComputeResult = try await api.post(
                APIConfig.validationEndpoint.appendingPathComponent("compute")
            )
            await loadAll()
            message = "Validation recomputed"
        } catch {
            message = "Recompute failed"
        }
    }
}
