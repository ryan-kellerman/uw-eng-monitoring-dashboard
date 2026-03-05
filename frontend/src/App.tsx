import { useEffect, useState } from "react";
import { fetchDashboards } from "./api";
import { DashboardConfig } from "./types";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboards()
      .then((d) => setDashboards(d))
      .catch((e) => setError(e.message));
  }, []);

  const active = dashboards[activeIdx];

  return (
    <div>
      <header className="app-header">
        <h1>Monitoring Dashboard</h1>
        <div className="dashboard-selector">
          {dashboards.map((d, i) => (
            <button
              key={d.name}
              className={i === activeIdx ? "active" : ""}
              onClick={() => setActiveIdx(i)}
            >
              {d.name}
            </button>
          ))}
        </div>
      </header>
      {error && <div className="mock-banner">Error loading dashboards: {error}</div>}
      {active && <Dashboard key={active.name} config={active} />}
    </div>
  );
}
