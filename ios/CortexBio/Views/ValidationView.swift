import SwiftUI
import Charts

struct ValidationView: View {
    @StateObject private var service = ValidationService()
    @State private var selectedTarget = "attention"

    private let targets = ["attention", "deep_work", "output"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                summarySection
                accuracyChart
                predictionVsActualChart
                featureImportanceSection
                baselineComparisonSection
            }
            .padding()
        }
        .task { await service.loadAll() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Prediction Validation")
                .font(.title2.bold())
            Text("Proves whether ML adds value beyond rules-based readiness.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Button("Refresh") { Task { await service.loadAll() } }
                    .buttonStyle(.bordered)
                Button("Recompute") { Task { await service.recompute() } }
                    .buttonStyle(.borderedProminent)
            }

            Text(service.message)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var summarySection: some View {
        Group {
            if let summary = service.summary {
                GroupBox("Summary") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Model")
                            Spacer()
                            Text(summary.modelVersion)
                                .foregroundStyle(.secondary)
                        }
                        HStack {
                            Text("Validated days")
                            Spacer()
                            Text("\(summary.validatedDays)")
                                .foregroundStyle(.secondary)
                        }
                        HStack {
                            Text("ML adds value")
                            Spacer()
                            Text(summary.mlAddsValue ? "Yes" : "No")
                                .foregroundStyle(summary.mlAddsValue ? .green : .orange)
                        }
                        Picker("Target", selection: $selectedTarget) {
                            ForEach(targets, id: \.self) { Text($0).tag($0) }
                        }
                        .pickerStyle(.segmented)

                        if let target = summary.targets[selectedTarget] ?? nil {
                            metricRow("MAE", String(format: "%.1f", target.mae))
                            metricRow("RMSE", String(format: "%.1f", target.rmse))
                            if let r = target.correlation {
                                metricRow("Correlation", String(format: "%.2f", r))
                            }
                            metricRow("Trend", target.trend)
                        }
                    }
                    .font(.footnote)
                }
            }
        }
    }

    private var accuracyChart: some View {
        GroupBox("Accuracy Over Time") {
            if let points = service.history?.accuracyOverTime, !points.isEmpty {
                Chart(points) { point in
                    if let mae = point.meanAbsoluteError {
                        LineMark(
                            x: .value("Date", point.date),
                            y: .value("MAE", mae)
                        )
                        .foregroundStyle(.blue)
                        PointMark(
                            x: .value("Date", point.date),
                            y: .value("MAE", mae)
                        )
                    }
                }
                .frame(height: 180)
                .chartYAxisLabel("Mean absolute error")
            } else {
                Text("No history yet")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var predictionVsActualChart: some View {
        GroupBox("Prediction vs Actual") {
            let rows = filteredHistory
            if rows.isEmpty {
                Text("No comparisons for \(selectedTarget)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                Chart(rows) { row in
                    LineMark(
                        x: .value("Date", row.predictionDate),
                        y: .value("Predicted", row.predictedValue)
                    )
                    .foregroundStyle(.orange)
                    LineMark(
                        x: .value("Date", row.predictionDate),
                        y: .value("Actual", row.actualValue)
                    )
                    .foregroundStyle(.green)
                }
                .frame(height: 180)
                .chartForegroundStyleScale([
                    "Predicted": .orange,
                    "Actual": .green
                ])
            }
        }
    }

    private var featureImportanceSection: some View {
        GroupBox("Feature Importance") {
            let rows = service.features?.featureImportance[mapTargetKey(selectedTarget)] ?? []
            if rows.isEmpty {
                Text("Train a model to see feature importance")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                Chart(rows.sorted { $0.importance > $1.importance }.prefix(8)) { row in
                    BarMark(
                        x: .value("Importance", row.importance),
                        y: .value("Feature", row.feature)
                    )
                    .foregroundStyle(.purple)
                }
                .frame(height: 200)
            }
        }
    }

    private var baselineComparisonSection: some View {
        GroupBox("Baseline Comparison") {
            if let row = service.features?.baselineComparison[selectedTarget] {
                VStack(spacing: 10) {
                    baselineBar(label: "ML model", value: row.modelMae, color: .blue)
                    baselineBar(label: "Yesterday", value: row.yesterday, color: .gray)
                    baselineBar(label: "7-day avg", value: row.rolling7, color: .gray)
                    baselineBar(label: "Readiness", value: row.readiness, color: .orange)
                }
            } else if let target = service.summary?.targets[selectedTarget] ?? nil,
                      let baseline = target.baselineMae {
                VStack(spacing: 10) {
                    baselineBar(label: "ML model", value: target.mae, color: .blue)
                    baselineBar(label: "Yesterday", value: baseline.yesterday, color: .gray)
                    baselineBar(label: "7-day avg", value: baseline.rolling7, color: .gray)
                    baselineBar(label: "Readiness", value: baseline.readiness, color: .orange)
                }
            } else {
                Text("No baseline comparison data")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var filteredHistory: [ValidationHistoryRow] {
        service.history?.history
            .filter { $0.targetType == selectedTarget }
            .sorted { $0.predictionDate < $1.predictionDate } ?? []
    }

    private func mapTargetKey(_ target: String) -> String {
        switch target {
        case "deep_work": return "deep_work"
        case "output": return "output"
        default: return "attention"
        }
    }

    private func metricRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value).foregroundStyle(.secondary)
        }
    }

    private func baselineBar(label: String, value: Double?, color: Color) -> some View {
        HStack {
            Text(label)
                .frame(width: 72, alignment: .leading)
            GeometryReader { geo in
                let width = geo.size.width * CGFloat(min((value ?? 0) / maxMae, 1))
                RoundedRectangle(cornerRadius: 4)
                    .fill(color.opacity(0.7))
                    .frame(width: max(width, 4))
            }
            .frame(height: 16)
            Text(value.map { String(format: "%.1f", $0) } ?? "—")
                .font(.caption)
                .frame(width: 36, alignment: .trailing)
        }
        .font(.footnote)
    }

    private var maxMae: Double {
        let values = [
            service.features?.baselineComparison[selectedTarget]?.modelMae,
            service.features?.baselineComparison[selectedTarget]?.yesterday,
            service.features?.baselineComparison[selectedTarget]?.rolling7,
            service.features?.baselineComparison[selectedTarget]?.readiness,
            service.summary?.targets[selectedTarget]??.mae
        ].compactMap { $0 }
        return values.max() ?? 1
    }
}

#Preview { ValidationView() }
