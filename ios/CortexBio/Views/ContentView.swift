import SwiftUI

struct ContentView: View {
    @StateObject private var healthKit = HealthKitManager()
    @StateObject private var syncService = SyncService()

    var body: some View {
        TabView {
            syncTab
                .tabItem { Label("Sync", systemImage: "heart.fill") }

            DailyLabelView()
                .tabItem { Label("Label", systemImage: "slider.horizontal.3") }

            WorkSessionView()
                .tabItem { Label("Session", systemImage: "timer") }

            InsightsView()
                .tabItem { Label("Insights", systemImage: "chart.line.uptrend.xyaxis") }

            WindowsView()
                .tabItem { Label("Windows", systemImage: "clock") }

            ForecastView()
                .tabItem { Label("Forecast", systemImage: "waveform.path.ecg") }

            PerformanceView()
                .tabItem { Label("Performance", systemImage: "brain.head.profile") }

            ValidationView()
                .tabItem { Label("Validation", systemImage: "checkmark.seal") }
        }
    }

    private var syncTab: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("HealthKit Sync")
                            .font(.title2.bold())
                        Text("Phase 0: physiology → feature store")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    GroupBox("HealthKit") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(healthKit.authorizationStatus).font(.footnote)
                            Button("Request Permissions") {
                                Task { await healthKit.requestAuthorization() }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    GroupBox("Sync") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(syncService.lastSyncMessage)
                                .font(.footnote)
                                .foregroundStyle(.secondary)

                            Button(syncService.isSyncing ? "Syncing..." : "Sync Today") {
                                Task { await syncDays(1) }
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(!healthKit.isAuthorized || syncService.isSyncing)

                            Button("Sync Last 7 Days") {
                                Task { await syncDays(7) }
                            }
                            .buttonStyle(.bordered)
                            .disabled(!healthKit.isAuthorized || syncService.isSyncing)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    if let features = syncService.todayFeatures {
                        GroupBox("Today's Features") {
                            VStack(alignment: .leading, spacing: 8) {
                                featureRow("Sleep", features.sleepDuration.map { String(format: "%.1f h", $0) })
                                featureRow("HRV", features.avgHrv.map { String(format: "%.0f ms", $0) })
                                featureRow("Steps", features.steps.map { String(format: "%.0f", $0) })
                            }
                            .font(.footnote)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Cortex Bio")
        }
    }

    private func featureRow(_ label: String, _ value: String?) -> some View {
        HStack {
            Text(label)
            Spacer()
            Text(value ?? "—").foregroundStyle(.secondary)
        }
    }

    private func syncDays(_ days: Int) async {
        do {
            let payload = try await healthKit.buildSyncPayload(days: days)
            try await syncService.sync(payload: payload)
        } catch {
            syncService.lastSyncMessage = "Sync failed: \(error.localizedDescription)"
        }
    }
}

#Preview { ContentView() }
