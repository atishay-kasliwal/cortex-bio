import SwiftUI

struct ForecastView: View {
    @StateObject private var service = ForecastService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("24-Hour Forecast")
                    .font(.title2.bold())

                Button("Refresh") { Task { await service.loadToday() } }
                    .buttonStyle(.borderedProminent)

                Text(service.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let f = service.forecast {
                    if let pred = f.dailyPrediction {
                        GroupBox("Tomorrow (ML)") {
                            metricRow("Attention", pred.predictedAttention)
                            metricRow("Deep work (min)", pred.predictedDeepWork)
                            metricRow("Output", pred.predictedOutput)
                        }
                    }

                    windowRow("Best Deep Work", f.bestDeepWorkWindow)
                    windowRow("Best Meetings", f.bestMeetingWindow)
                    windowRow("Recovery", f.recoveryWindow)

                    GroupBox("Hourly Performance") {
                        ForEach(f.hourlyForecast) { point in
                            HStack {
                                Text(String(format: "%02d:00", point.hour))
                                    .font(.caption.monospaced())
                                ProgressView(value: Double(point.score), total: 100)
                                Text("\(point.score)")
                                    .font(.caption)
                                    .frame(width: 28, alignment: .trailing)
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .task { await service.loadToday() }
    }

    private func metricRow(_ label: String, _ value: Double?) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value.map { String(format: "%.0f", $0) } ?? "—")
                .foregroundStyle(.secondary)
        }
        .font(.footnote)
    }

    private func windowRow(_ label: String, _ window: TimeWindow?) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(window != nil ? "scheduled" : "—")
                .foregroundStyle(.secondary)
                .font(.footnote)
        }
    }
}

#Preview { ForecastView() }
