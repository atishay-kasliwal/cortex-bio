import SwiftUI

struct PerformanceView: View {
    @StateObject private var service = PerformanceService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Work Performance")
                    .font(.title2.bold())
                Text("Predicts Cortex metrics from Apple Watch data.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Button("Train Model") { Task { await service.trainModel() } }
                    .buttonStyle(.bordered)

                Button("Load Tomorrow") { Task { await service.loadTomorrow() } }
                    .buttonStyle(.borderedProminent)

                Text(service.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let p = service.prediction {
                    GroupBox("Tomorrow's Prediction") {
                        metricRow("Attention", p.predictedAttention, suffix: "/100")
                        metricRow("Deep work", p.predictedDeepWork, suffix: " min")
                        metricRow("Output", p.predictedOutput, suffix: "/100")
                        HStack {
                            Text("Confidence")
                            Spacer()
                            Text(String(format: "%.0f%%", p.confidence * 100))
                        }
                        HStack {
                            Text("Validated")
                            Spacer()
                            Text(p.validated ? "Yes" : "No")
                                .foregroundStyle(p.validated ? .green : .orange)
                        }
                    }
                    .font(.footnote)
                }
            }
            .padding()
        }
    }

    private func metricRow(_ label: String, _ value: Double?, suffix: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value.map { String(format: "%.0f", $0) + suffix } ?? "—")
                .foregroundStyle(.secondary)
        }
    }
}

#Preview { PerformanceView() }
