import React, { useMemo } from 'react';
import { Clock, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const AXIS_STYLE = { fill: '#64748B', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };
const GRID_STROKE = 'rgba(0,240,255,0.05)';

function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-neon-cyan/20 bg-[#0B0F19]/95 backdrop-blur-md px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-400 font-mono mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-bold font-mono" style={{ color: entry.color || '#00F0FF' }}>
          {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-lg border border-neon-cyan/20 bg-[#0B0F19]/95 backdrop-blur-md px-4 py-3 shadow-xl">
      <p className="text-xs text-slate-400 font-mono mb-1">{data.name}</p>
      <p className="text-sm font-bold font-mono" style={{ color: data.payload.fill }}>
        {data.value.toLocaleString()} requests
      </p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, iconColor = 'text-neon-cyan' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  );
}

export default function Charts() {
  const { metrics } = useLogs();

  // Use pre-computed metrics data for timeline
  const timelineData = useMemo(() => {
    if (!metrics || !metrics.requestsOverTime || metrics.requestsOverTime.length === 0) return [];
    return metrics.requestsOverTime.map((item) => ({
      time: item.time,
      requests: item.count,
    }));
  }, [metrics]);

  // Use pre-computed top IPs
  const topIPsData = useMemo(() => {
    if (!metrics || !metrics.topIPs) return [];
    return metrics.topIPs.slice(0, 10).map((item) => ({
      ip: item.ip,
      count: item.count,
    }));
  }, [metrics]);

  // Use pre-computed status distribution
  const statusData = useMemo(() => {
    if (!metrics || !metrics.statusDistribution) return [];
    return metrics.statusDistribution.map((item) => ({
      name: item.name,
      value: item.value,
      fill: item.color || '#64748B',
    }));
  }, [metrics]);

  const BAR_COLORS = [
    '#BD00FF', '#A800E0', '#9200C2', '#7D00A5', '#680089',
    '#5C007A', '#51006B', '#46005C', '#3B004D', '#30003E',
  ];

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Row 1: Area Chart — full width */}
      <div className="glass-panel p-6">
        <SectionHeader icon={Clock} title="Request Volume Over Time" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="time"
                tick={AXIS_STYLE}
                axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
                tickLine={false}
                interval="preserveStartEnd"
                angle={-35}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={AXIS_STYLE}
                axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip prefix="Requests: " />} />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#00F0FF"
                strokeWidth={2}
                fill="url(#colorCyan)"
                dot={false}
                activeDot={{ r: 4, fill: '#00F0FF', stroke: '#0B0F19', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Bar Chart + Pie Chart side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart — Top 10 Source IPs */}
        <div className="glass-panel p-6">
          <SectionHeader icon={BarChart3} title="Top 10 Source IPs" iconColor="text-neon-purple" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topIPsData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                <XAxis
                  type="number"
                  tick={AXIS_STYLE}
                  axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="ip"
                  tick={AXIS_STYLE}
                  axisLine={{ stroke: 'rgba(100,116,139,0.2)' }}
                  tickLine={false}
                  width={120}
                />
                <Tooltip content={<CustomTooltip prefix="Requests: " />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {topIPsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart — Response Code Distribution */}
        <div className="glass-panel p-6">
          <SectionHeader icon={PieChartIcon} title="Response Code Distribution" iconColor="text-neon-cyan" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="rgba(11,15,25,0.8)"
                  strokeWidth={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
