import ReactECharts from "echarts-for-react";
import { QueryResult, WidgetConfig } from "../types";

const COLORS = ["#1f6feb", "#3fb950", "#d29922", "#f85149", "#a371f7", "#79c0ff", "#f0883e"];

interface Props {
  type: "line_chart" | "bar_chart" | "area_chart" | "pie_chart";
  data: QueryResult;
  config: WidgetConfig;
}

export default function ChartWidget({ type, data, config }: Props) {
  const { series_column, x_column, y_column, y_format } = config;

  // Multi-series: group by series_column
  if (series_column && x_column && y_column) {
    const xIdx = data.columns.indexOf(x_column);
    const yIdx = data.columns.indexOf(y_column);
    const sIdx = data.columns.indexOf(series_column);

    if (xIdx === -1 || yIdx === -1 || sIdx === -1) {
      return <div className="widget-error">Column not found in result</div>;
    }

    // Collect unique x values and series names
    const xSet = new Set<string>();
    const seriesMap = new Map<string, Map<string, number>>();

    for (const row of data.rows) {
      const x = String(row[xIdx]).split("T")[0]; // trim time from ISO dates
      const s = String(row[sIdx]);
      const y = Number(row[yIdx]);
      xSet.add(x);
      if (!seriesMap.has(s)) seriesMap.set(s, new Map());
      seriesMap.get(s)!.set(x, y);
    }

    const xValues = Array.from(xSet).sort();
    const chartType = type === "bar_chart" ? "bar" : "line";
    const seriesEntries = Array.from(seriesMap.entries());

    return (
      <ReactECharts
        notMerge={true}
        style={{ height: "100%", width: "100%" }}
        option={{
          tooltip: {
            trigger: "axis",
            valueFormatter: y_format === "percent"
              ? (v: number) => `${(v * 100).toFixed(1)}%`
              : undefined,
          },
          legend: {
            data: seriesEntries.map(([name]) => name),
            textStyle: { color: "#c9d1d9", fontSize: 11 },
            bottom: 0,
          },
          grid: { left: 60, right: 16, top: 16, bottom: 40 },
          xAxis: {
            type: "category",
            data: xValues,
            axisLabel: { color: "#8b949e", fontSize: 11 },
            axisLine: { lineStyle: { color: "#30363d" } },
          },
          yAxis: {
            type: "value",
            axisLabel: {
              color: "#8b949e",
              fontSize: 11,
              formatter: y_format === "percent"
                ? (v: number) => `${(v * 100).toFixed(0)}%`
                : undefined,
            },
            splitLine: { lineStyle: { color: "#21262d" } },
          },
          series: seriesEntries.map(([name, valMap], i) => ({
            name,
            type: chartType,
            smooth: true,
            data: xValues.map((x) => valMap.get(x) ?? null),
            itemStyle: { color: COLORS[i % COLORS.length] },
            areaStyle: type === "area_chart" ? { opacity: 0.3 } : undefined,
          })),
        }}
      />
    );
  }

  // Simple single-series fallback
  const xData = data.rows.map((r) => String(r[0]));
  const yData = data.rows.map((r) => Number(r[1]));

  if (type === "pie_chart") {
    return (
      <ReactECharts
        notMerge={true}
        style={{ height: "100%", width: "100%" }}
        option={{
          tooltip: { trigger: "item" },
          series: [
            {
              type: "pie",
              radius: ["40%", "70%"],
              data: data.rows.map((r) => ({ name: String(r[0]), value: Number(r[1]) })),
              label: { color: "#c9d1d9" },
            },
          ],
        }}
      />
    );
  }

  const chartType = type === "bar_chart" ? "bar" : "line";

  return (
    <ReactECharts
      style={{ height: "100%", width: "100%" }}
      option={{
        tooltip: { trigger: "axis" },
        grid: { left: 50, right: 16, top: 16, bottom: 30 },
        xAxis: {
          type: "category",
          data: xData,
          axisLabel: { color: "#8b949e", fontSize: 11 },
          axisLine: { lineStyle: { color: "#30363d" } },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: "#8b949e", fontSize: 11 },
          splitLine: { lineStyle: { color: "#21262d" } },
        },
        series: [
          {
            data: yData,
            type: chartType,
            smooth: true,
            itemStyle: { color: "#1f6feb" },
            areaStyle: type === "area_chart" ? { opacity: 0.3 } : undefined,
          },
        ],
      }}
    />
  );
}
