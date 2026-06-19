import SwiftUI

struct InsightsView: View {
    @StateObject private var analytics = AnalyticsService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Personal Insights")
                    .font(.title2.bold())
                Text("Statistics only. No ML.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack {
                    Button("Refresh Correlations") {
                        Task { await analytics.loadCorrelations() }
                    }
                    .buttonStyle(.bordered)

                    Button("Generate Insights") {
                        Task { await analytics.generateInsights() }
                    }
                    .buttonStyle(.borderedProminent)
                }

                Text(analytics.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if !analytics.correlations.isEmpty {
                    GroupBox("Correlations") {
                        ForEach(analytics.correlations.prefix(8)) { row in
                            HStack {
                                Text("\(row.featureLabel) ↔ \(row.outcomeLabel)")
                                    .font(.footnote)
                                Spacer()
                                Text(String(format: "r=%.2f", row.correlation))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                if !analytics.insights.isEmpty {
                    GroupBox("Insights") {
                        ForEach(analytics.insights) { insight in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(insight.title)
                                    .font(.subheadline.bold())
                                if let desc = insight.description {
                                    Text(desc)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                if let impact = insight.impactPct {
                                    Text("Impact: \(impact > 0 ? "+" : "")\(Int(impact))%")
                                        .font(.caption2)
                                        .foregroundStyle(impact > 0 ? .green : .red)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .padding()
        }
        .task {
            await analytics.loadCorrelations()
            await analytics.loadInsights()
        }
    }
}

#Preview { InsightsView() }
