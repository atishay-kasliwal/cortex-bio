import SwiftUI

struct WorkSessionView: View {
    @StateObject private var sessionService = SessionService()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Deep Work Session")
                    .font(.title2.bold())

                if let active = sessionService.activeSession {
                    GroupBox("Active Session") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(active.projectName ?? "Session")
                                .font(.headline)
                            Text("Started \(active.startedAt.formatted(date: .omitted, time: .shortened))")
                                .font(.footnote)
                                .foregroundStyle(.secondary)

                            Picker("Quality", selection: $sessionService.selectedQuality) {
                                ForEach(QUALITY_OPTIONS, id: \.self) { q in
                                    Text(q.capitalized).tag(q)
                                }
                            }

                            Button("End Session") {
                                Task { await sessionService.endSession() }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }
                } else {
                    Picker("Working on", selection: $sessionService.selectedType) {
                        ForEach(SESSION_TYPES, id: \.self) { type in
                            Text(type).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)

                    Button("Start Session") {
                        Task { await sessionService.startSession() }
                    }
                    .buttonStyle(.borderedProminent)
                }

                Text(sessionService.message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .task { await sessionService.refreshActive() }
    }
}

#Preview { WorkSessionView() }
