import { useEffect, useState } from "react";
import { fetchDeployLogs, DeployVersion } from "../api";

interface Props {
  trigger: string;
}

export default function DeployLog({ trigger }: Props) {
  const [logs, setLogs] = useState<Record<string, DeployVersion[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeployLogs()
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const versions = logs[trigger] ?? [];

  return (
    <div className="deploy-log">
      <div className="deploy-log-header">
        <span>Deployment Log</span>
        <span className="deploy-log-trigger">{trigger}</span>
      </div>
      <div className="deploy-log-body">
        {loading ? (
          <div className="deploy-log-loading">Loading...</div>
        ) : error ? (
          <div className="widget-error">{error}</div>
        ) : versions.length === 0 ? (
          <div className="deploy-log-empty">No versions found</div>
        ) : (
          <div className="deploy-log-list">
            {versions.map((v) => (
              <div
                key={v.versionNumber}
                className={`deploy-log-entry${v.isActive ? " active" : ""}`}
              >
                <div className="deploy-log-entry-header">
                  <span className="deploy-log-date">{v.publishDate}</span>
                  {v.isActive && <span className="deploy-log-badge">LIVE</span>}
                </div>
                <div className="deploy-log-name">{v.name}</div>
                <div className="deploy-log-version">v{v.versionNumber}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
