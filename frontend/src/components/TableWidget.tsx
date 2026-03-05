import { QueryResult } from "../types";

interface Props {
  data: QueryResult;
}

export default function TableWidget({ data }: Props) {
  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <table className="data-table">
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{String(cell ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
