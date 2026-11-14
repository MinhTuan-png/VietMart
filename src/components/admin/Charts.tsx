"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const fmt = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(1) + " tỷ" : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + " tr" : n >= 1e3 ? (n / 1e3).toFixed(0) + "k" : String(n));
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + "₫";
const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

export function RevenueChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data.map((d) => ({ ...d, label: d.date.slice(8, 10) + "/" + d.date.slice(5, 7) }))} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={20} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={50} />
        <Tooltip formatter={(v, n) => (n === "revenue" ? [vnd(Number(v)), "Doanh thu"] : [String(v), "Đơn"])} />
        <Area type="monotone" dataKey="revenue" stroke="#f04e23" strokeWidth={2} fill="url(#rev)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => vnd(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SimpleBar({ data, color = "#2563eb" }: { data: { name: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
