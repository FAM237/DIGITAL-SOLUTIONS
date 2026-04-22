import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, AreaChart, Area } from 'recharts';

const COLORS = ['#0f766e', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
      {label && <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, display: 'inline-block' }}/>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export function TaskDistributionChart({ data }) {
  if (!data?.length) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Aucune donnée</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
        </Pie>
        <Tooltip content={<CustomTooltip/>}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProjectProgressChart({ data }) {
  if (!data?.length) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Aucune donnée</div>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false}/>
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} width={80} tickLine={false}/>
        <Tooltip content={<CustomTooltip/>} formatter={(v) => [`${v}%`, 'Progression']}/>
        <Bar dataKey="progress" fill="#0f766e" radius={[0, 4, 4, 0]} maxBarSize={18}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="gradAct" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false}/>
        <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false}/>
        <Tooltip content={<CustomTooltip/>}/>
        <Area type="monotone" dataKey="taches" name="Tâches" stroke="#0f766e" strokeWidth={2} fill="url(#gradAct)"/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TaskStatusBarChart({ data }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false}/>
        <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false} axisLine={false}/>
        <Tooltip content={<CustomTooltip/>}/>
        <Legend wrapperStyle={{ fontSize: 11 }}/>
        <Bar dataKey="todo" name="À faire" fill="#F59E0B" stackId="a" radius={[0,0,3,3]}/>
        <Bar dataKey="inprogress" name="En cours" fill="#3B82F6" stackId="a"/>
        <Bar dataKey="done" name="Terminé" fill="#10B981" stackId="a" radius={[3,3,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BudgetChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false}/>
        <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`}/>
        <Tooltip content={<CustomTooltip/>} formatter={v => [`${v.toLocaleString()} FCFA`, 'Budget']}/>
        <Bar dataKey="budget" name="Budget" fill="#8B5CF6" radius={[4,4,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UserActivityRadar({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--border)"/>
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text2)' }}/>
        <Radar name="Score" dataKey="value" stroke="#0f766e" fill="#0f766e" fillOpacity={0.25}/>
        <Tooltip content={<CustomTooltip/>}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function TeamWorkloadChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false}/>
        <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickLine={false}/>
        <Tooltip content={<CustomTooltip/>}/>
        <Legend wrapperStyle={{ fontSize: 11 }}/>
        <Bar dataKey="termine" name="Terminées" fill="#10B981" stackId="s" radius={[0,0,3,3]}/>
        <Bar dataKey="enCours" name="En cours" fill="#3B82F6" stackId="s"/>
        <Bar dataKey="aFaire" name="À faire" fill="#F59E0B" stackId="s" radius={[3,3,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
