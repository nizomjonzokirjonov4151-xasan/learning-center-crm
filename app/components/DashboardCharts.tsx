"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type MonthStudentPoint = { month: string; students: number };
export type MonthRevenuePoint = { month: string; revenue: number };
export type AttendancePoint = { date: string; present: number; absent: number; late: number };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-5">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  );
}

export function DashboardCharts({
  studentGrowth,
  revenueByMonth,
  attendanceTrend,
}: {
  studentGrowth: MonthStudentPoint[];
  revenueByMonth: MonthRevenuePoint[];
  attendanceTrend: AttendancePoint[];
}) {
  const hasStudents = studentGrowth.some((d) => d.students > 0);
  const hasRevenue = revenueByMonth.some((d) => d.revenue > 0);
  const hasAttendance = attendanceTrend.some((d) => d.present + d.absent + d.late > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Student Growth — Last 6 Months">
          {hasStudents ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={studentGrowth} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [String(value), "New Students"]}
                />
                <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No student data yet" />
          )}
        </ChartCard>

        <ChartCard title="Revenue — Last 6 Months (UZS)">
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByMonth} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}k`
                      : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    new Intl.NumberFormat("en-US").format(Math.round(Number(value))) + " UZS",
                    "Revenue",
                  ]}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No payment data yet" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Attendance Trend — Last 7 Days">
        {hasAttendance ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceTrend} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="present"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981" }}
                activeDot={{ r: 5 }}
                name="Present"
              />
              <Line
                type="monotone"
                dataKey="absent"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#ef4444" }}
                activeDot={{ r: 5 }}
                name="Absent"
              />
              <Line
                type="monotone"
                dataKey="late"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b" }}
                activeDot={{ r: 5 }}
                name="Late"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No attendance records yet" />
        )}
      </ChartCard>
    </div>
  );
}
