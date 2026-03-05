export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  title: string;
  type: "line_chart" | "bar_chart" | "area_chart" | "pie_chart" | "kpi" | "table";
  source: "snowflake" | "api";
  query?: string;
  // For API source
  service?: string;
  method?: string;
  path?: string;
  body?: Record<string, unknown>;
  refresh: number; // seconds
  layout: WidgetLayout;
  // Multi-series support
  series_column?: string;
  x_column?: string;
  y_column?: string;
  y_format?: "percent" | "number";
  suffix?: string;
}

export interface DashboardParameter {
  id: string;
  label: string;
  type: "select";
  default: string;
  options: string[];
  filter_column?: string; // column name to filter on client-side
}

export interface DashboardConfig {
  name: string;
  description?: string;
  parameters?: DashboardParameter[];
  widgets: WidgetConfig[];
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  _mock?: boolean;
}
