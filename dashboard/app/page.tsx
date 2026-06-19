const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type MorningBrief = {
  date: string;
  readiness_score: number;
  drivers: { factor: string; impact: string; direction: string }[];
  focus_windows: {
    window_type: string;
    start_time: string;
    end_time: string;
  }[];
  engine_version: string;
};

function formatWindow(window: MorningBrief["focus_windows"][0]) {
  const start = new Date(window.start_time).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(window.end_time).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

function windowLabel(type: string) {
  switch (type) {
    case "peak_focus":
      return "Peak Focus";
    case "secondary_peak":
      return "Secondary Peak";
    case "expected_crash":
      return "Expected Crash";
    default:
      return type;
  }
}

export default async function Home() {
  let brief: MorningBrief | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${API_URL}/api/readiness/today`, {
      cache: "no-store",
    });
    if (res.ok) {
      brief = await res.json();
    } else {
      error = "No readiness data yet. Sync HealthKit data from the iOS app.";
    }
  } catch {
    error = "API unavailable. Run docker compose up in cortex-bio/.";
  }

  return (
    <main style={{ maxWidth: 720, margin: "48px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Today&apos;s Cognitive Forecast</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        Rules-based readiness until you have 90 days of labeled data.
      </p>

      {error && <p style={{ color: "#b45309" }}>{error}</p>}

      {brief && (
        <>
          <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 8 }}>
            {Math.round(brief.readiness_score)}
          </div>
          <p style={{ color: "#666", marginBottom: 32 }}>Readiness score</p>

          <section style={{ marginBottom: 32 }}>
            {brief.focus_windows.map((window) => (
              <div
                key={window.window_type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{windowLabel(window.window_type)}</strong>
                <span>{formatWindow(window)}</span>
              </div>
            ))}
          </section>

          {brief.drivers.length > 0 && (
            <section>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Drivers</h2>
              {brief.drivers.map((driver) => (
                <div
                  key={driver.factor}
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}
                >
                  <span>{driver.factor}</span>
                  <span style={{ color: driver.direction === "positive" ? "#15803d" : "#b91c1c" }}>
                    {driver.impact}
                  </span>
                </div>
              ))}
            </section>
          )}

          <p style={{ marginTop: 32, color: "#999", fontSize: 12 }}>
            Engine: {brief.engine_version}
          </p>
        </>
      )}
    </main>
  );
}
