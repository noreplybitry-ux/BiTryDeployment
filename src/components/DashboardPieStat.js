import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from "recharts";
import "../css/DashboardPieStat.css";

/**
 * Props:
 *  - data: [{ name: 'Wins', value: 4 }, { name: 'Losses', value: 1 }]
 *  - colors: ['#2ecc71', '#e74c3c']  // for each slice
 *  - size: number (px) height/width of chart container (default 120)
 *  - centerLabel: string (text shown centered, e.g. '80%')
 *  - subLabel: string (small text below centerLabel)
 *  - showPercentage: boolean (if true, append % to tooltip values)
 */
export default function PieStat({
  data = [],
  colors = ["#2ecc71", "#e74c3c"],
  size = 120,
  centerLabel = "",
  subLabel = "",
  showPercentage = false
}) {
  const formatter = showPercentage 
    ? (value, name) => [`${value}%`, name]
    : (value, name) => [value, name];

  return (
    <div className="pie-stat" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius="70%"
            innerRadius="48%"
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            stroke="rgba(0,0,0,0.06)"
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={formatter}
            contentStyle={{ background: "#222831", borderRadius: 6, border: "none" }}
            itemStyle={{ color: "#fff" }}
            cursor={{ fill: "transparent" }}
          />
        </PieChart>
      </ResponsiveContainer>
      
    </div>
  );
}