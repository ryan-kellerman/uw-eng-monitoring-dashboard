import { useMemo, useState } from "react";
import ReactGridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { DashboardConfig } from "../types";
import Widget from "./Widget";
import DeployLog from "./DeployLog";

interface Props {
  config: DashboardConfig;
}

export default function Dashboard({ config }: Props) {
  const [hasMockData, setHasMockData] = useState(false);

  // Initialize parameter values from defaults
  const [params, setParams] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const p of config.parameters ?? []) {
      defaults[p.id] = p.default;
    }
    return defaults;
  });

  const layout = useMemo(
    () =>
      config.widgets.map((w) => ({
        i: w.id,
        x: w.layout.x,
        y: w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
        minW: 2,
        minH: 1,
      })),
    [config]
  );

  const selectedTrigger = params["trigger"];

  return (
    <div className="dashboard-container">
      {hasMockData && (
        <div className="mock-banner">
          Using mock data — Snowflake connection not available
        </div>
      )}
      {config.description && (
        <p style={{ color: "#8b949e", marginBottom: 12, fontSize: 14 }}>
          {config.description}
        </p>
      )}
      {(config.parameters?.length ?? 0) > 0 && (
        <div className="params-bar">
          {config.parameters!.map((p) => (
            <label key={p.id} className="param-control">
              <span className="param-label">{p.label}</span>
              <select
                value={params[p.id] ?? p.default}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
              >
                {p.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <ReactGridLayout
            layout={layout}
            cols={12}
            rowHeight={120}
            width={880}
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
          >
            {config.widgets.map((w) => (
              <div key={w.id} style={{ height: "100%" }}>
                <Widget
                  config={w}
                  params={params}
                  paramDefs={config.parameters ?? []}
                  onMockData={() => setHasMockData(true)}
                />
              </div>
            ))}
          </ReactGridLayout>
        </div>
        {selectedTrigger && (
          <div className="dashboard-sidebar">
            <DeployLog trigger={selectedTrigger} />
          </div>
        )}
      </div>
    </div>
  );
}
