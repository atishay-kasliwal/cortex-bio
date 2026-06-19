import Foundation

@MainActor
final class AnalyticsService: ObservableObject {
    @Published var correlations: [CorrelationsResponse.CorrelationRow] = []
    @Published var insights: [Insight] = []
    @Published var message = ""

    private let api = APIClient.shared

    func loadCorrelations() async {
        do {
            let response: CorrelationsResponse = try await api.get(
                APIConfig.analyticsEndpoint.appendingPathComponent("correlations")
            )
            correlations = response.correlations.filter { $0.sufficient }
            message = correlations.isEmpty
                ? "Need 14+ days of labels + features for correlations"
                : "\(correlations.count) significant correlations"
        } catch {
            message = "Analytics unavailable"
        }
    }

    func generateInsights() async {
        do {
            struct GenerateResponse: Codable {
                let generated: Int
            }
            let _: GenerateResponse = try await api.post(
                APIConfig.analyticsEndpoint.appendingPathComponent("insights/generate")
            )
            await loadInsights()
            message = "Insights updated"
        } catch {
            message = "Generate failed: \(error.localizedDescription)"
        }
    }

    func loadInsights() async {
        do {
            let response: InsightsResponse = try await api.get(
                APIConfig.analyticsEndpoint.appendingPathComponent("insights")
            )
            insights = response.insights
        } catch {
            message = "Could not load insights"
        }
    }
}
