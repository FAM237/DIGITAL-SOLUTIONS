// ReportsPage.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import {
  TaskDistributionChart, ProjectProgressChart,
  TaskStatusBarChart, BudgetChart, TeamWorkloadChart,
  UserActivityRadar, ActivityChart
} from '../components/Charts';

const PRIO_COLORS  = { critique: '#EF4444', haute: '#F59E0B', moyenne: '#3B82F6', basse: '#10B981' };
const PRIO_LABELS  = { critique: 'Critique', haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };
const STATUT_COLORS = { a_faire: '#F59E0B', en_cours: '#3B82F6', termine: '#10B981' };

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function KpiCard({ value, label, sublabel, color, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: color + '22', color }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon}/>
        </svg>
      </div>
      <div className="kpi-body">
        <div className="kpi-value" style={{ color }}>{value}</div>
        <div className="kpi-label">{label}</div>
        {sublabel && <div className="kpi-sub">{sublabel}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="section-header" style={{ marginBottom: 14 }}>
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  );
}

export default function ReportsPage() {
  const { lang, mockProjects, mockTasks, mockUsers, mockTeams, mockActivity, isAdmin } = useApp();
  const t = useT(lang);
  const [tab, setTab] = useState('overview');
  const [exportMsg, setExportMsg] = useState('');

  if (!isAdmin) return (
    <div className="empty-state">
      <div className="empty-icon">—</div>
      <div className="empty-title">Accès réservé aux administrateurs</div>
    </div>
  );

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalProjects  = mockProjects.length;
  const activeProjects = mockProjects.filter(p => p.statut === 'actif').length;
  const totalTasks     = mockTasks.length;
  const doneTasks      = mockTasks.filter(t => t.statut === 'termine').length;
  const inProgressTasks= mockTasks.filter(t => t.statut === 'en_cours').length;
  const overdueTasks   = mockTasks.filter(t => t.statut !== 'termine' && t.dateEcheance && new Date(t.dateEcheance) < new Date()).length;
  const totalHours     = mockTasks.reduce((s, t) => s + (t.tempsLoggue || 0), 0);
  const estimatedHours = mockTasks.reduce((s, t) => s + (t.tempsEstime || 0), 0);
  const globalProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalBudget    = mockProjects.reduce((s, p) => s + (p.budget || 0), 0);
  const activeUsers    = mockUsers.filter(u => u.actif).length;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const pieData = [
    { name: 'À faire',   value: mockTasks.filter(t => t.statut === 'a_faire').length  },
    { name: 'En cours',  value: inProgressTasks },
    { name: 'Terminé',   value: doneTasks },
  ].filter(d => d.value > 0);

  const progressData = mockProjects.slice(0, 8).map(p => ({
    name: p.titre.length > 14 ? p.titre.slice(0, 14) + '…' : p.titre,
    progress: p.progression || 0,
  }));

  const barData = mockProjects.map(p => ({
    name: p.titre.length > 12 ? p.titre.slice(0, 12) + '…' : p.titre,
    todo:       mockTasks.filter(t => t.projetId === p._id && t.statut === 'a_faire').length,
    inprogress: mockTasks.filter(t => t.projetId === p._id && t.statut === 'en_cours').length,
    done:       mockTasks.filter(t => t.projetId === p._id && t.statut === 'termine').length,
  }));

  const budgetData = mockProjects.filter(p => p.budget).map(p => ({
    name: p.titre.length > 12 ? p.titre.slice(0, 12) + '…' : p.titre,
    budget: p.budget,
  }));

  const teamWorkload = mockTeams.map(team => {
    const teamTasks = mockTasks.filter(t => {
      const proj = mockProjects.find(p => p._id === t.projetId);
      return proj?.equipeId === team._id;
    });
    return {
      name: team.nom.length > 14 ? team.nom.slice(0, 14) + '…' : team.nom,
      aFaire: teamTasks.filter(t => t.statut === 'a_faire').length,
      enCours: teamTasks.filter(t => t.statut === 'en_cours').length,
      termine: teamTasks.filter(t => t.statut === 'termine').length,
    };
  });

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      name: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      taches: mockActivity.filter(a => {
        const ad = new Date(a.date);
        return ad.toDateString() === d.toDateString();
      }).length || Math.floor(Math.random() * 6 + 1),
    };
  });

  // User performance
  const userPerf = mockUsers.map(u => {
    const assigned   = mockTasks.filter(t => t.assigneA === u.id).length;
    const done       = mockTasks.filter(t => t.assigneA === u.id && t.statut === 'termine').length;
    const hours      = mockTasks.filter(t => t.assigneA === u.id).reduce((s, t) => s + (t.tempsLoggue || 0), 0);
    const overdue    = mockTasks.filter(t => t.assigneA === u.id && t.statut !== 'termine' && t.dateEcheance && new Date(t.dateEcheance) < new Date()).length;
    const rate       = assigned > 0 ? Math.round((done / assigned) * 100) : 0;
    return { ...u, assigned, done, hours, overdue, rate };
  });

  // Priority breakdown
  const prioBrk = ['critique','haute','moyenne','basse'].map(p => ({
    label: PRIO_LABELS[p], color: PRIO_COLORS[p],
    count: mockTasks.filter(t => t.priorite === p).length,
    done:  mockTasks.filter(t => t.priorite === p && t.statut === 'termine').length,
  }));

  // Radar data for top user
  const topUser = userPerf[0];
  const radarData = [
    { subject: 'Tâches', value: Math.min(100, (topUser?.assigned || 0) * 10) },
    { subject: 'Terminées', value: Math.min(100, (topUser?.done || 0) * 12) },
    { subject: 'Heures', value: Math.min(100, (topUser?.hours || 0) * 4) },
    { subject: 'Taux (%)', value: topUser?.rate || 0 },
    { subject: 'Ponctualité', value: topUser ? Math.max(0, 100 - (topUser.overdue * 20)) : 0 },
  ];

  const handleExport = () => {
    const rows = [
      ['Projet','Statut','Priorité','Progression','Tâches totales','Terminées','Budget'],
      ...mockProjects.map(p => [
        p.titre, p.statut, p.priorite || '-',
        `${p.progression || 0}%`,
        mockTasks.filter(t => t.projetId === p._id).length,
        mockTasks.filter(t => t.projetId === p._id && t.statut === 'termine').length,
        p.budget ? `${p.budget.toLocaleString()} FCFA` : '-',
      ])
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rapport_digital_solutions.csv';
    a.click(); URL.revokeObjectURL(url);
    setExportMsg('Rapport exporté !');
    setTimeout(() => setExportMsg(''), 2500);
  };

  const tabs = [
    { key: 'overview',  label: lang === 'fr' ? 'Vue globale'   : 'Overview'    },
    { key: 'projects',  label: lang === 'fr' ? 'Projets'       : 'Projects'    },
    { key: 'teams',     label: lang === 'fr' ? 'Équipes'       : 'Teams'       },
    { key: 'users',     label: lang === 'fr' ? 'Utilisateurs'  : 'Users'       },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('reports.title')}</h1>
          <p className="page-subtitle">{lang === 'fr' ? 'Analyses complètes de la plateforme' : 'Complete platform analytics'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          {t('reports.export')} CSV
          {exportMsg && <span style={{ marginLeft: 6, color: '#10B981' }}>{lang === 'fr' ? 'Exporté' : 'Exported'}</span>}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-bar" style={{ marginBottom: 24 }}>
        {tabs.map(tb => (
          <button key={tb.key} className={`tab-btn${tab === tb.key ? ' active' : ''}`} onClick={() => setTab(tb.key)}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="kpi-grid">
            <KpiCard value={activeProjects} label="Projets actifs"   sublabel={`${totalProjects} total`}  color="#0f766e" icon="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7l1 12a2 2 0 002 2h12a2 2 0 002-2l1-12"/>
            <KpiCard value={totalTasks}    label="Tâches totales"   sublabel={`${doneTasks} terminées`}   color="#3B82F6" icon="M9 11l3 3 8-8M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
            <KpiCard value={`${globalProgress}%`} label="Progression globale" sublabel={`${inProgressTasks} en cours`} color="#10B981" icon="M18 20V10M12 20V4M6 20v-6"/>
            <KpiCard value={overdueTasks}  label="Tâches en retard" sublabel="nécessitent attention"     color="#EF4444" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <KpiCard value={`${totalHours}h`} label="Heures loggées" sublabel={`/${estimatedHours}h estimées`} color="#8B5CF6" icon="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zM12 8v4l3 3"/>
            <KpiCard value={`${(totalBudget/1000000).toFixed(1)}M`} label="Budget total (FCFA)" sublabel="tous projets" color="#d97706" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            <KpiCard value={activeUsers}   label="Utilisateurs actifs" sublabel={`${mockUsers.length} total`} color="#EC4899" icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8"/>
            <KpiCard value={mockTeams.length} label="Équipes"        sublabel="configurées"                color="#14b8a6" icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </div>

          {/* Charts row 1 */}
          <div className="charts-grid" style={{ marginTop: 24 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Distribution des tâches</span></div>
              <TaskDistributionChart data={pieData}/>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Activité quotidienne (7 jours)</span></div>
              <ActivityChart data={activityData}/>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Progression par projet</span></div>
              <ProjectProgressChart data={progressData}/>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Budget par projet (FCFA)</span></div>
              <BudgetChart data={budgetData}/>
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><span className="card-title">Répartition par priorité</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '4px 0' }}>
              {prioBrk.map(p => (
                <div key={p.label} className="prio-card" style={{ borderLeft: `4px solid ${p.color}` }}>
                  <div className="prio-count" style={{ color: p.color }}>{p.count}</div>
                  <div className="prio-label">{p.label}</div>
                  <div className="prio-sub">{p.done} terminée{p.done > 1 ? 's' : ''}</div>
                  <div className="progress" style={{ marginTop: 6, height: 4 }}>
                    <div className="progress-fill" style={{ width: `${p.count > 0 ? (p.done / p.count) * 100 : 0}%`, background: p.color }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><span className="card-title">Activité récente de la plateforme</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mockActivity.slice(0, 8).map(a => {
                const u = mockUsers.find(x => x.id === a.userId);
                const timeAgo = (() => {
                  const diff = Math.floor((Date.now() - new Date(a.date)) / 60000);
                  if (diff < 60) return `il y a ${diff} min`;
                  if (diff < 1440) return `il y a ${Math.floor(diff/60)}h`;
                  return `il y a ${Math.floor(diff/1440)} j`;
                })();
                return (
                  <div key={a.id} className="activity-item">
                    <div className="activity-avatar">{u?.nom?.charAt(0) || '?'}</div>
                    <div className="activity-body">
                      <span className="activity-name">{u?.nom || 'Système'}</span>
                      <span className="activity-action"> {a.action} </span>
                      <span className="activity-target">«{a.cible}»</span>
                    </div>
                    <div className="activity-time">{timeAgo}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── PROJECTS TAB ── */}
      {tab === 'projects' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Tâches par projet (empilé)</span></div>
            <TaskStatusBarChart data={barData}/>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Détail des projets</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Projet</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>Équipe</th>
                    <th>Tâches</th>
                    <th>Terminées</th>
                    <th>Progression</th>
                    <th>Échéance</th>
                    <th>Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProjects.map(p => {
                    const ptasks  = mockTasks.filter(t => t.projetId === p._id);
                    const pdone   = ptasks.filter(t => t.statut === 'termine').length;
                    const team    = mockTeams.find(te => te._id === p.equipeId);
                    const isLate  = p.dateEcheance && new Date(p.dateEcheance) < new Date() && p.statut === 'actif';
                    return (
                      <tr key={p._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.couleur || 'var(--primary)', display: 'inline-block', flexShrink: 0 }}/>
                            <strong>{p.titre}</strong>
                          </div>
                        </td>
                        <td><span className={`badge badge-${p.statut}`}>{p.statut === 'actif' ? 'Actif' : 'Archivé'}</span></td>
                        <td><span className="badge" style={{ background: PRIO_COLORS[p.priorite] + '22', color: PRIO_COLORS[p.priorite] }}>{PRIO_LABELS[p.priorite] || '-'}</span></td>
                        <td>{team?.nom || '-'}</td>
                        <td>{ptasks.length}</td>
                        <td>{pdone}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="progress" style={{ flex: 1, height: 5 }}>
                              <div className="progress-fill" style={{ width: `${p.progression || 0}%`, background: p.couleur || 'var(--primary)' }}/>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text2)', minWidth: 34 }}>{p.progression || 0}%</span>
                          </div>
                        </td>
                        <td style={{ color: isLate ? '#EF4444' : 'var(--text2)', fontSize: '0.82rem' }}>
                          {isLate && ' '}{fmtDate(p.dateEcheance)}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{p.budget ? `${(p.budget/1000000).toFixed(1)}M` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TEAMS TAB ── */}
      {tab === 'teams' && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><span className="card-title">Charge de travail par équipe</span></div>
            <TeamWorkloadChart data={teamWorkload}/>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Détail des équipes</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Équipe</th>
                    <th>Membres</th>
                    <th>Projets assignés</th>
                    <th>Tâches totales</th>
                    <th>Terminées</th>
                    <th>En cours</th>
                    <th>Taux complétion</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTeams.map(team => {
                    const teamProjects = mockProjects.filter(p => p.equipeId === team._id);
                    const teamTasks    = mockTasks.filter(t => teamProjects.some(p => p._id === t.projetId));
                    const done         = teamTasks.filter(t => t.statut === 'termine').length;
                    const inProgress   = teamTasks.filter(t => t.statut === 'en_cours').length;
                    const rate         = teamTasks.length > 0 ? Math.round((done / teamTasks.length) * 100) : 0;
                    return (
                      <tr key={team._id}>
                        <td><strong>{team.nom}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div className="avatar-group">
                              {(team.membresInfo || []).slice(0, 3).map(m => (
                                <div key={m.id} className="avatar avatar-xs" title={m.nom}>{m.nom?.charAt(0)}</div>
                              ))}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{(team.membresInfo || []).length}</span>
                          </div>
                        </td>
                        <td>{teamProjects.length}</td>
                        <td>{teamTasks.length}</td>
                        <td style={{ color: '#10B981', fontWeight: 600 }}>{done}</td>
                        <td style={{ color: '#3B82F6', fontWeight: 600 }}>{inProgress}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress" style={{ flex: 1, height: 6 }}>
                              <div className="progress-fill" style={{ width: `${rate}%`, background: rate >= 70 ? '#10B981' : rate >= 40 ? '#F59E0B' : '#EF4444' }}/>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: rate >= 70 ? '#10B981' : 'var(--text2)', minWidth: 34 }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          <div className="charts-grid" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Performance utilisateur</span></div>
              <UserActivityRadar data={radarData}/>
              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text3)', marginTop: 4 }}>
                Basé sur : {topUser?.nom}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Classement par tâches terminées</span></div>
              <div style={{ padding: '8px 0' }}>
                {[...userPerf].sort((a, b) => b.done - a.done).map((u, i) => (
                  <div key={u.id} className="rank-item">
                    <span className="rank-num" style={{ color: i < 3 ? ['#d97706','#6b7280','#92400e'][i] : 'var(--text3)' }}>#{i + 1}</span>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.72rem' }}>{u.nom.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.nom}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{u.poste}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10B981' }}>{u.done}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>terminées</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Tableau de performance individuelle</span></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Poste</th>
                    <th>Tâches assignées</th>
                    <th>Terminées</th>
                    <th>En retard</th>
                    <th>Heures loggées</th>
                    <th>Taux complétion</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {userPerf.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.72rem' }}>{u.nom.charAt(0)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.nom}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>{u.role}</span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{u.poste}</td>
                      <td style={{ textAlign: 'center' }}>{u.assigned}</td>
                      <td style={{ textAlign: 'center', color: '#10B981', fontWeight: 600 }}>{u.done}</td>
                      <td style={{ textAlign: 'center', color: u.overdue > 0 ? '#EF4444' : 'var(--text3)', fontWeight: u.overdue > 0 ? 600 : 400 }}>{u.overdue}</td>
                      <td style={{ textAlign: 'center' }}>{u.hours}h</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress" style={{ flex: 1, height: 5 }}>
                            <div className="progress-fill" style={{ width: `${u.rate}%`, background: u.rate >= 70 ? '#10B981' : u.rate >= 40 ? '#F59E0B' : '#EF4444' }}/>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 34 }}>{u.rate}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.actif ? 'badge-actif' : 'badge-archive'}`}>{u.actif ? 'Actif' : 'Inactif'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
