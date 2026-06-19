import SwiftUI

struct WindowsView: View {
    @StateObject private var service = WindowsService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Cognitive Windows")
                    .font(.title2.bold())

                Button("Refresh") { Task { await service.loadToday() } }
                    .buttonStyle(.borderedProminent)

                Text(service.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if let w = service.windows {
                    windowRow("Peak Focus", w.peakWindow)
                    windowRow("Secondary Peak", w.secondaryWindow)
                    windowRow("Crash", w.crashWindow)

                    if !w.hourlyCurve.isEmpty {
                        GroupBox("Hourly Curve") {
                            ForEach(w.hourlyCurve) { point in
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
            }
            .padding()
        }
        .task { await service.loadToday() }
    }

    private func windowRow(_ label: String, _ window: TimeWindow?) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(formatWindow(window))
                .foregroundStyle(.secondary)
                .font(.footnote)
        }
    }

    private func formatWindow(_ window: TimeWindow?) -> String {
        guard let window else { return "—" }
        return "\(formatTime(window.start)) – \(formatTime(window.end))"
    }

    private func formatTime(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso) {
            return date.formatted(date: .omitted, time: .shortened)
        }
        return iso
    }
}

#Preview { WindowsView() }
