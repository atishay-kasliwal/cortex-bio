import Foundation

@MainActor
final class ForecastService: ObservableObject {
    @Published var forecast: ForecastResponse?
    @Published var message = ""

    private let api = APIClient.shared

    func loadToday() async {
        do {
            forecast = try await api.get(APIConfig.forecastEndpoint.appendingPathComponent("today"))
            message = "Forecast loaded"
        } catch {
            message = "Forecast unavailable: \(error.localizedDescription)"
        }
    }
}
