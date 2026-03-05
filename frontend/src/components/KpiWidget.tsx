import { QueryResult } from "../types";

interface Props {
  data: QueryResult;
  suffix?: string;
}

export default function KpiWidget({ data, suffix }: Props) {
  const value = data.rows.length > 0 ? data.rows[0][data.rows[0].length - 1] : "—";
  const formatted =
    typeof value === "number"
      ? value.toLocaleString()
      : String(value);

  return (
    <div className="kpi-value">
      {formatted}{suffix && <span style={{ fontSize: "0.5em", color: "#8b949e" }}>{suffix}</span>}
    </div>
  );
}
