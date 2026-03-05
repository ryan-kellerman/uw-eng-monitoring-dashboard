import { DashboardConfig, QueryResult } from "./types";

// In dev, Vite proxies /api to localhost:8000. In prod, set VITE_API_BASE.
const BASE = import.meta.env.VITE_API_BASE || "";

export async function fetchDashboards(): Promise<DashboardConfig[]> {
  const res = await fetch(`${BASE}/api/dashboards`);
  if (!res.ok) throw new Error(`Failed to fetch dashboards: ${res.statusText}`);
  return res.json();
}

export async function fetchDashboard(name: string): Promise<DashboardConfig> {
  const res = await fetch(`${BASE}/api/dashboards/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Dashboard not found: ${name}`);
  return res.json();
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  const res = await fetch(`${BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Query failed: ${detail}`);
  }
  return res.json();
}

export interface DeployVersion {
  versionNumber: number;
  name: string;
  publishDate: string;
  isActive: boolean;
}

export async function fetchDeployLogs(): Promise<Record<string, DeployVersion[]>> {
  const res = await fetch(`${BASE}/api/sliderule/deploy-logs`);
  if (!res.ok) throw new Error(`Failed to fetch deploy logs: ${res.statusText}`);
  return res.json();
}

export async function proxyApiCall(
  service: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${BASE}/api/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service, method, path, body }),
  });
  if (!res.ok) throw new Error(`API proxy failed: ${res.statusText}`);
  return res.json();
}
