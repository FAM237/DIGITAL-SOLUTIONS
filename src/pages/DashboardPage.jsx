import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import { TaskDistributionChart, ProjectProgressChart, ActivityChart, TaskStatusBarChart, BudgetChart } from '../components/Charts';
import { Icon } from '../components/Layout';

const PRIO_COLORS = { critique: '#EF4444', haute: '#F59E0B', moyenne: '#3B82F6', basse: '#10B981' };
const PRIO_LABELS = { critique: 'Critique', haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
function isOverdue(d) { return d && new Date(d) < new Date() && new Date(d).toDateString() !== new Date().toDateString(); }
function isToday(d) { return d && new Date(d).toDateString() === new Date().toDateString(); }

function StatCard({ value, label, color, bg, icon, delta }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon}/>
        </svg>
      </div>
      <div>
        <div className="stat-number">{value}</div>
        <div className="stat-label">{label}</div>
        {delta !== undefined && <div className="stat-delta" style={{ color: delta >= 0 ? '#10B981' : '#EF4444' }}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}</div>}
      </div>
    </div>
  );
}

function ActivityItem({ item, users }) {
  const u = users?.find(x => x.id === item.userId);
  const typeIcons = { task: 'M9 11l3 3 8-8', project: 'M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7l1 12a2 2 0 002 2h12a2 2 0 002-2l1-12', comment: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', time: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 8v4l3 3' };
  const timeAgo = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 60000);
    if (diff < 1) return 'à l\'instant';
    if (diff < 60) return `il y a ${diff} min`;
    if (diff < 1440) return `il y a ${Math.floor(diff/60)}h`;
    return `il y a ${Math.floor(diff/1440)} j`;
  };
  return (
    <div className="activity-item">
      <div className="activity-avatar">{u?.nom?.charAt(0) || '?'}</div>
      <div className="activity-body">
        <span className="activity-name">{u?.nom || 'Système'}</span>
        <span className="activity-action"> {item.action} </span>
        <span className="activity-target">{item.cible}</span>
      </div>
      <div className="activity-time">{timeAgo(item.date)}</div>
    </div>
  );
}

// ── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ t, lang }) {
  const { mockProjects, mockTasks, mockUsers, mockTeams, mockActivity, user } = useApp();
  const navigate = useNavigate();

  const activeProjects = mockProjects.filter(p => p.statut === 'actif');
  const totalTasks = mockTasks.length;
  const doneTasks  = mockTasks.filter(t => t.statut === 'termine').length;
  const overdueTasks = mockTasks.filter(t => t.statut !== 'termine' && isOverdue(t.dateEcheance)).length;
  const activeUsers  = mockUsers.filter(u => u.actif).length;

  const pieData = [
    { name: t('tasks.todo'),       value: mockTasks.filter(t => t.statut === 'a_faire').length },
    { name: t('tasks.inProgress'), value: mockTasks.filter(t => t.statut === 'en_cours').length },
    { name: t('tasks.done'),       value: doneTasks },
  ].filter(d => d.value > 0);

  const progressData = activeProjects.slice(0, 6).map(p => ({
    name: p.titre.length > 14 ? p.titre.slice(0, 14) + '…' : p.titre,
    progress: p.progression || 0,
  }));

  const barData = activeProjects.slice(0, 6).map(p => {
    const tasks = mockTasks.filter(t => t.projetId === p._id);
    return {
      name: p.titre.length > 10 ? p.titre.slice(0, 10) + '…' : p.titre,
      todo:       tasks.filter(t => t.statut === 'a_faire').length,
      inprogress: tasks.filter(t => t.statut === 'en_cours').length,
      done:       tasks.filter(t => t.statut === 'termine').length,
    };
  });

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { name: d.toLocaleDateString('fr-FR', { weekday: 'short' }), taches: Math.floor(Math.random() * 8 + 1) };
  });

  const budgetData = activeProjects.slice(0, 5).map(p => ({
    name: p.titre.length > 10 ? p.titre.slice(0, 10) + '…' : p.titre,
    budget: p.budget || 0,
  }));

  const globalPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-greeting">{t('dashboard.greeting')}, {user?.nom}</h1>
          <p className="page-subtitle">{t('dashboard.adminSubtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projects')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          {t('nav.newProject')}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard value={activeProjects.length} label={t('dashboard.activeProjects')} color="var(--primary)" bg="var(--primary-l)" icon="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7l1 12a2 2 0 002 2h12a2 2 0 002-2l1-12"/>
        <StatCard value={totalTasks} label={t('dashboard.totalTasks')} color="var(--warning)" bg="var(--warning-l)" icon="M9 11l3 3 8-8M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
        <StatCard value={`${globalPct}%`} label={t('dashboard.globalProgress')} color="var(--success)" bg="var(--success-l)" icon="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        <StatCard value={activeUsers} label={t('dashboard.totalUsers')} color="var(--info)" bg="var(--info-l)" icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8"/>
        <StatCard value={mockTeams.length} label={t('dashboard.totalTeams')} color="#8B5CF6" bg="rgba(139,92,246,.12)" icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        <StatCard value={overdueTasks} label={t('dashboard.overdue')} color="#EF4444" bg="rgba(239,68,68,.1)" icon="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </div>

      <div className="charts-grid">
        <div className="card"><div className="card-header"><span className="card-title">{t('dashboard.taskDistribution')}</span></div><TaskDistributionChart data={pieData}/></div>
        <div className="card"><div className="card-header"><span className="card-title">{t('dashboard.progressByProject')}</span></div><ProjectProgressChart data={progressData}/></div>
        <div className="card"><div className="card-header"><span className="card-title">{t('dashboard.activityOverview')}</span></div><ActivityChart data={activityData}/></div>
        <div className="card"><div className="card-header"><span className="card-title">Tâches par projet</span></div><TaskStatusBarChart data={barData}/></div>
        <div className="card col-span-2"><div className="card-header"><span className="card-title">Budget par projet (FCFA)</span></div><BudgetChart data={budgetData}/></div>
      </div>

      <div className="dashboard-bottom-grid">
        <div>
          <div className="section-header"><h2 className="section-title">{t('dashboard.recentProjects')}</h2><Link to="/projects" className="btn btn-ghost btn-sm">{t('dashboard.viewAll')} →</Link></div>
          <div className="project-list">
            {activeProjects.slice(0, 5).map(p => (
              <Link key={p._id} to={`/projects/${p._id}`} className="project-list-item">
                <div className="pli-color" style={{ background: p.couleur || 'var(--primary)' }}/>
                <div className="pli-body">
                  <div className="pli-title">{p.titre}</div>
                  <div className="progress pli-progress"><div className="progress-fill" style={{ width: `${p.progression}%` }}/></div>
                </div>
                <div className="pli-right">
                  <span className="pli-pct">{p.progression}%</span>
                  <span className={`badge badge-prio-${p.priorite}`}>{PRIO_LABELS[p.priorite]}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="section-header"><h2 className="section-title">{t('admin.recentActivity')}</h2></div>
          <div className="card" style={{ padding: '12px' }}>
            {mockActivity.slice(0, 8).map(item => <ActivityItem key={item.id} item={item} users={mockUsers}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Dashboard ───────────────────────────────────────────────────────────
function UserDashboard({ t, lang }) {
  const { user, mockProjects, mockTasks, mockTeams, mockActivity, mockUsers } = useApp();
  const navigate = useNavigate();

  const myTasks    = mockTasks.filter(tk => tk.assigneA === user?.id);
  const myProjects = useMemo(() => {
    const myTeamIds = mockTeams.filter(t => t.membres?.includes(user?.id)).map(t => t._id);
    return mockProjects.filter(p => p.equipeId && myTeamIds.includes(p.equipeId));
  }, [mockProjects, mockTeams, user]);

  const doneTasks    = myTasks.filter(t => t.statut === 'termine').length;
  const pendingTasks = myTasks.filter(t => t.statut !== 'termine').length;
  const overdueTasks = myTasks.filter(t => t.statut !== 'termine' && isOverdue(t.dateEcheance));
  const todayTasks   = myTasks.filter(t => t.statut !== 'termine' && isToday(t.dateEcheance));
  const totalLogged  = myTasks.reduce((s, t) => s + (t.tempsLoggue || 0), 0);

  const pieData = [
    { name: t('tasks.todo'),       value: myTasks.filter(t => t.statut === 'a_faire').length },
    { name: t('tasks.inProgress'), value: myTasks.filter(t => t.statut === 'en_cours').length },
    { name: t('tasks.done'),       value: doneTasks },
  ].filter(d => d.value > 0);

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { name: d.toLocaleDateString('fr-FR', { weekday: 'short' }), taches: Math.floor(Math.random() * 5 + 1) };
  });

  const statusMap = { a_faire: { label: t('tasks.todo'), cls: 'todo' }, en_cours: { label: t('tasks.inProgress'), cls: 'inprogress' }, termine: { label: t('tasks.done'), cls: 'done' } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-greeting">{t('dashboard.greeting')}, {user?.nom}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/my-tasks')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          {t('nav.myTasks')}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard value={myProjects.length} label={lang === 'fr' ? 'Mes projets' : 'My projects'} color="var(--primary)" bg="var(--primary-l)" icon="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7l1 12a2 2 0 002 2h12a2 2 0 002-2l1-12"/>
        <StatCard value={pendingTasks} label={lang === 'fr' ? 'Tâches en attente' : 'Pending tasks'} color="var(--warning)" bg="var(--warning-l)" icon="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 8v4l3 3"/>
        <StatCard value={doneTasks} label={t('dashboard.completed')} color="var(--success)" bg="var(--success-l)" icon="M9 11l3 3 8-8"/>
        <StatCard value={`${totalLogged}h`} label={lang === 'fr' ? 'Heures loggées' : 'Hours logged'} color="var(--info)" bg="var(--info-l)" icon="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 8v4l3 3"/>
      </div>

      {(overdueTasks.length > 0 || todayTasks.length > 0) && (
        <div className="alert-row">
          {overdueTasks.length > 0 && (
            <div className="alert alert-danger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
              <strong>{overdueTasks.length}</strong> {lang === 'fr' ? 'tâche(s) en retard' : 'overdue task(s)'}
              <Link to="/my-tasks" className="alert-link">{lang === 'fr' ? 'Voir →' : 'View →'}</Link>
            </div>
          )}
          {todayTasks.length > 0 && (
            <div className="alert alert-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
              <strong>{todayTasks.length}</strong> {lang === 'fr' ? "tâche(s) dûe(s) aujourd'hui" : "task(s) due today"}
            </div>
          )}
        </div>
      )}

      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card"><div className="card-header"><span className="card-title">{lang === 'fr' ? 'Mes tâches' : 'My tasks'}</span></div><TaskDistributionChart data={pieData}/></div>
        <div className="card"><div className="card-header"><span className="card-title">{t('dashboard.activityOverview')}</span></div><ActivityChart data={activityData}/></div>
      </div>

      <div className="dashboard-bottom-grid">
        <div>
          <div className="section-header"><h2 className="section-title">{lang === 'fr' ? 'Mes tâches récentes' : 'My recent tasks'}</h2><Link to="/my-tasks" className="btn btn-ghost btn-sm">{t('dashboard.viewAll')} →</Link></div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {myTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><div className="empty-title">{t('tasks.noTasks')}</div></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Tâche</th><th>Projet</th><th>Statut</th><th>Échéance</th></tr></thead>
                <tbody>
                  {myTasks.slice(0, 6).map(task => {
                    const project = mockProjects.find(p => p._id === task.projetId);
                    const s = statusMap[task.statut] || statusMap.a_faire;
                    const od = isOverdue(task.dateEcheance) && task.statut !== 'termine';
                    return (
                      <tr key={task._id} onClick={() => navigate(`/projects/${task.projetId}`)} style={{ cursor: 'pointer' }}>
                        <td><div style={{ fontWeight: 500 }}>{task.titre}</div></td>
                        <td><span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{project?.titre || '-'}</span></td>
                        <td><span className={`status-badge status-${s.cls}`}>{s.label}</span></td>
                        <td><span style={{ fontSize: '0.78rem', color: od ? 'var(--danger)' : 'var(--text3)', fontWeight: od ? 600 : 400 }}>{fmtDate(task.dateEcheance)}{od ? ' ' : ''}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div>
          <div className="section-header"><h2 className="section-title">{lang === 'fr' ? 'Mes projets' : 'My projects'}</h2><Link to="/projects" className="btn btn-ghost btn-sm">{t('dashboard.viewAll')} →</Link></div>
          <div className="project-list">
            {myProjects.length === 0 ? (
              <div className="card empty-state" style={{ padding: 20 }}><div className="empty-title">{t('dashboard.noProjects')}</div></div>
            ) : myProjects.slice(0, 5).map(p => (
              <Link key={p._id} to={`/projects/${p._id}`} className="project-list-item">
                <div className="pli-color" style={{ background: p.couleur || 'var(--primary)' }}/>
                <div className="pli-body">
                  <div className="pli-title">{p.titre}</div>
                  <div className="progress pli-progress"><div className="progress-fill" style={{ width: `${p.progression}%` }}/></div>
                </div>
                <span className="pli-pct">{p.progression}%</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin, lang } = useApp();
  const t = useT(lang);
  return isAdmin ? <AdminDashboard t={t} lang={lang}/> : <UserDashboard t={t} lang={lang}/>;
}
