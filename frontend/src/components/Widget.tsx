import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { executeQuery } from "../api";
import { WidgetConfig, QueryResult, DashboardParameter } from "../types";
import ChartWidget from "./ChartWidget";
import KpiWidget from "./KpiWidget";
import TableWidget from "./TableWidget";

interface Props {
  config: WidgetConfig;
  params: Record<string, string>;
  paramDefs: DashboardParameter[];
  onMockData: () => void;
}

function applyFilters(
  data: QueryResult,
  params: Record<string, string>,
  paramDefs: DashboardParameter[]
): QueryResult {
  // Build list of filters: { columnIndex, value, columnName }
  const filters: { colIdx: number; value: string; colName: string }[] = [];
  for (const p of paramDefs) {
    if (!p.filter_column) continue;
    const colIdx = data.columns.indexOf(p.filter_column);
    if (colIdx === -1) continue;
    filters.push({ colIdx, value: params[p.id] ?? p.default, colName: p.filter_column });
  }

  if (filters.length === 0) return data;

  // Filter rows
  const filteredRows = data.rows.filter((row) =>
    filters.every((f) => String(row[f.colIdx]) === f.value)
  );

  // Remove filter columns from output
  const filterColIdxs = new Set(filters.map((f) => f.colIdx));
  const newColumns = data.columns.filter((_, i) => !filterColIdxs.has(i));
  const newRows = filteredRows.map((row) =>
    row.filter((_, i) => !filterColIdxs.has(i))
  );

  return { columns: newColumns, rows: newRows, _mock: data._mock };
}

export default function Widget({ config, params, paramDefs, onMockData }: Props) {
  const [rawData, setRawData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (config.source === "snowflake" && config.query) {
        const result = await executeQuery(config.query);
        if (result._mock) onMockData();
        setRawData(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [config, onMockData]);

  useEffect(() => {
    fetchData();
    if (config.refresh > 0) {
      intervalRef.current = window.setInterval(fetchData, config.refresh * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, config.refresh]);

  // Client-side filtering — instant on param change
  const data = useMemo(
    () => (rawData ? applyFilters(rawData, params, paramDefs) : null),
    [rawData, params, paramDefs]
  );

  const statusClass = error ? "error" : loading ? "loading" : "";

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span>{config.title}</span>
        <span className={`refresh-indicator ${statusClass}`} />
      </div>
      <div className="widget-body">
        {error ? (
          <div className="widget-error">{error}</div>
        ) : !data ? null : config.type === "kpi" ? (
          <KpiWidget data={data} suffix={config.suffix} />
        ) : config.type === "table" ? (
          <TableWidget data={data} />
        ) : (
          <ChartWidget type={config.type} data={data} config={config} />
        )}
      </div>
    </div>
  );
}
