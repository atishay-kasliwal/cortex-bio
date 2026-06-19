import SwiftUI

struct DailyLabelView: View {
    @StateObject private var labelService = LabelService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("How was today?")
                    .font(.title2.bold())
                Text("One entry per day. Takes <15 seconds.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let progress = labelService.progress {
                    ProgressView(value: Double(progress.dailyLabels), total: Double(progress.goalDailyLabels)) {
                        Text("Daily labels: \(progress.dailyLabels)/\(progress.goalDailyLabels)")
                    }
                    ProgressView(value: Double(progress.completedSessions), total: Double(progress.goalSessions)) {
                        Text("Sessions: \(progress.completedSessions)/\(progress.goalSessions)")
                    }
                }

                scoreSlider("Productivity", value: $labelService.productivity)
                scoreSlider("Energy", value: $labelService.energy)
                scoreSlider("Focus", value: $labelService.focus)
                scoreSlider("Mood", value: $labelService.mood)

                TextField("Notes (optional)", text: $labelService.notes, axis: .vertical)
                    .textFieldStyle(.roundedBorder)

                Button("Save Today") {
                    Task { await labelService.saveToday() }
                }
                .buttonStyle(.borderedProminent)

                Text(labelService.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .task { await labelService.loadProgress() }
    }

    private func scoreSlider(_ title: String, value: Binding<Double>) -> some View {
        VStack(alignment: .leading) {
            HStack {
                Text(title)
                Spacer()
                Text("\(Int(value.wrappedValue))")
                    .foregroundStyle(.secondary)
            }
            Slider(value: value, in: 1...5, step: 1)
        }
    }
}

#Preview { DailyLabelView() }
