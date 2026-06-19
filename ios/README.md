# Cortex Bio iOS App

Reference **SwiftUI + HealthKit** client for the [Cortex Bio](https://github.com/atriveo/cortex-bio) wearable intelligence platform.

This is a research reference app — not a productivity tracker. It syncs biometrics to the feature store and surfaces readiness, cognitive windows, forecasts, and validation dashboards.

## Tabs

| Tab | Purpose |
|-----|---------|
| Sync | HealthKit authorization and ingest |
| Label | Self-reported daily scores (OSS ground truth) |
| Session | Work session quality ratings |
| Insights | Correlations and personal insights |
| Windows | Cognitive performance curve |
| Forecast | 24-hour performance forecast |
| Performance | ML predictions |
| Validation | Prediction vs actual, baseline comparison |

See the main [README](../README.md) for architecture and API setup.

## Setup

1. Open Xcode → **File → New → Project → iOS App**
2. Product name: `CortexBio`, Interface: SwiftUI, Language: Swift
3. Copy the files from `ios/CortexBio/` into your Xcode project
4. Add **HealthKit** capability: Target → Signing & Capabilities → + Capability → HealthKit
5. Add to `Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Cortex Bio reads sleep, HRV, heart rate, steps, and workouts to estimate cognitive readiness.</string>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

6. Update `APIConfig.baseURL` in `Models/APIModels.swift` to your Mac's LAN IP (required for physical iPhone):

```swift
static let baseURL = URL(string: "http://192.168.1.100:8000")!
```

## Phase 0 metrics

- Sleep (stages → `sleep_sessions`)
- HRV (`hrv`)
- Resting HR (`resting_hr`)
- Steps (`steps`)
- Workouts (`workouts`)

Nothing else until the feature store is stable.
