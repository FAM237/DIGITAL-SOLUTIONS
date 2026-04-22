import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }
function isOverdue(d) { return d && new Date(d) < new Date(); }
function isToday(d) { return d && new Date(d).toDateString() === new Date().toDateString(); }

const PRIO_META = { critique: { label: 'Critique', color: '#EF4444', bg: '#FEE2E2' }, haute: { label: 'Haute', color: '#F59E0B', bg: '#FEF3C7' }, moyenne: { label: 'Moyenne', color: '#3B82F6', bg: '#DBEAFE' }, basse: { label: 'Basse', color: '#10B981', bg: '#D1FAE5' } };

export default function MyTasksPage() {
  const { lang, user, mockTasks, setMockTasks, mockProjects, mockUsers, addToast, uid, now, logActivity } = useApp();
  const t = useT(lang);

  const [filterStatus, setFS] = useState('tous');
  const [filterPrio,   setFP] = useState('tous');
  const [sortBy, setSortBy]   = useState('date');
  const [search, setSearch]   = useState('');
  const [logTask, setLogTask] = useState(null);
  const [logHours, setLogHours] = useState('');

  const myTasks = mockTasks.filter(tk => tk.assigneA === user?.id);

  const displayed = useMemo(() => {
    let list = myTasks;
    if (filterStatus !== 'tous') list = list.filter(t => t.statut === filterStatus);
    if (filterPrio !== 'tous') list = list.filter(t => t.priorite === filterPrio);
    if (search) list = list.filter(t => t.titre.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === 'prio') list = [...list].sort((a, b) => ['critique','haute','moyenne','basse'].indexOf(a.priorite) - ['critique','haute','moyenne','basse'].indexOf(b.priorite));
    else if (sortBy === 'date') list = [...list].sort((a, b) => new Date(a.dateEcheance || '9999') - new Date(b.dateEcheance || '9999'));
    else if (sortBy === 'status') list = [...list].sort((a, b) => ['a_faire','en_cours','termine'].indexOf(a.statut) - ['a_faire','en_cours','termine'].indexOf(b.statut));
    return list;
  }, [myTasks, filterStatus, filterPrio, sortBy, search]);

  const overdue  = myTasks.filter(t => t.statut !== 'termine' && isOverdue(t.dateEcheance));
  const todayT   = myTasks.filter(t => t.statut !== 'termine' && isToday(t.dateEcheance));
  const doneT    = myTasks.filter(t => t.statut === 'termine');
  const totalH   = myTasks.reduce((s, t) => s + (t.tempsLoggue || 0), 0);
  const estimH   = myTasks.reduce((s, t) => s + (t.tempsEstime || 0), 0);

  function updateStatus(task, newStatus) {
    setMockTasks(prev => prev.map(t => t._id === task._id ? { ...t, statut: newStatus, dateFin: newStatus === 'termine' ? now() : null } : t));
    logActivity(newStatus === 'termine' ? 'a terminé la tâche' : 'a mis à jour la tâche', task.titre, 'task');
    addToast(t('tasks.taskUpdated'), 'success');
  }

  function logTime() {
    const hrs = parseFloat(logHours);
    if (!hrs || hrs <= 0) return;
    setMockTasks(prev => prev.map(t => t._id === logTask._id ? { ...t, tempsLoggue: (t.tempsLoggue || 0) + hrs } : t));
    logActivity(`a loggué ${hrs}h sur`, logTask.titre, 'time');
    addToast(`${hrs}h loggué(es)`, 'success');
    setLogTask(null); setLogHours('');
  }

  const statusMap = { a_faire: { label: 'À faire', cls: 'todo' }, en_cours: { label: 'En cours', cls: 'inprogress' }, termine: { label: 'Terminé', cls: 'done' } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav.myTasks')}</h1>
          <p className="page-subtitle">{myTasks.length} {lang === 'fr' ? 'tâche(s) assignée(s)' : 'assigned task(s)'}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {[
          { v: myTasks.length,   l: 'Total',         c: 'var(--primary)', bg: 'var(--primary-l)' },
          { v: overdue.length,   l: 'En retard',     c: 'var(--danger)',  bg: 'rgba(239,68,68,.1)' },
          { v: todayT.length,    l: "Dû aujourd'hui",c: 'var(--warning)', bg: 'var(--warning-l)' },
          { v: doneT.length,     l: 'Terminées',     c: 'var(--success)', bg: 'var(--success-l)' },
          { v: `${totalH}/${estimH}h`, l: 'Temps loggué', c: 'var(--info)', bg: 'var(--info-l)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div><div className="stat-number" style={{ color: s.c }}>{s.v}</div><div className="stat-label">{s.l}</div></div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        <div className="search-input">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input" placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="filter-group">
          {[['tous','Tous'],['a_faire','À faire'],['en_cours','En cours'],['termine','Terminé']].map(([v,l]) => (
            <button key={v} className={`filter-btn${filterStatus === v ? ' active' : ''}`} onClick={() => setFS(v)}>{l}</button>
          ))}
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterPrio} onChange={e => setFP(e.target.value)}>
          <option value="tous">Priorité: Toutes</option>
          <option value="critique">Critique</option>
          <option value="haute">Haute</option>
          <option value="moyenne">Moyenne</option>
          <option value="basse">Basse</option>
        </select>
        <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date">Trier: Échéance</option>
          <option value="prio">Trier: Priorité</option>
          <option value="status">Trier: Statut</option>
        </select>
      </div>

      {/* Tasks */}
      {displayed.length === 0 ? (
        <div className="empty-state"><div className="empty-title">{t('tasks.noTasks')}</div></div>
      ) : (
        <div className="tasks-list">
          {displayed.map(task => {
            const project = mockProjects.find(p => p._id === task.projetId);
            const sm = statusMap[task.statut] || statusMap.a_faire;
            const pm = PRIO_META[task.priorite] || PRIO_META.moyenne;
            const od = isOverdue(task.dateEcheance) && task.statut !== 'termine';
            const td = isToday(task.dateEcheance) && task.statut !== 'termine';
            const timeProgress = task.tempsEstime > 0 ? Math.min(100, Math.round((task.tempsLoggue / task.tempsEstime) * 100)) : null;

            return (
              <div key={task._id} className={`task-row${task.statut === 'termine' ? ' task-done' : ''}`}>
                <div className="task-row-left">
                  <button className="task-check" style={{ borderColor: task.statut === 'termine' ? '#10B981' : 'var(--border2)', background: task.statut === 'termine' ? '#10B981' : 'transparent' }}
                    onClick={() => updateStatus(task, task.statut === 'termine' ? 'en_cours' : 'termine')}>
                    {task.statut === 'termine' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                  </button>
                  <div className="task-row-body">
                    <div className="task-row-title" style={{ textDecoration: task.statut === 'termine' ? 'line-through' : 'none' }}>{task.titre}</div>
                    <div className="task-row-meta">
                      {project && <Link to={`/projects/${project._id}`} className="task-project-link" onClick={e => e.stopPropagation()}>{project.titre}</Link>}
                      {task.tags?.map(tag => <span key={tag} className="task-tag">{tag}</span>)}
                      {task.commentaires?.length > 0 && <span className="task-meta-item">{task.commentaires.length} commentaire(s)</span>}
                    </div>
                    {timeProgress !== null && (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 999, maxWidth: 100 }}>
                          <div style={{ height: '100%', width: `${timeProgress}%`, background: timeProgress > 100 ? 'var(--danger)' : 'var(--primary)', borderRadius: 999 }}/>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>{task.tempsLoggue || 0}h / {task.tempsEstime}h</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="task-row-right">
                  <span className="prio-tag" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span>
                  {task.dateEcheance && (
                    <span style={{ fontSize: '0.75rem', color: od ? 'var(--danger)' : td ? 'var(--warning)' : 'var(--text3)', fontWeight: od || td ? 600 : 400 }}>
                      {fmtDate(task.dateEcheance)}
                    </span>
                  )}
                  <select className={`status-select status-${sm.cls}`} value={task.statut} onChange={e => updateStatus(task, e.target.value)}>
                    <option value="a_faire">À faire</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setLogTask(task); setLogHours(''); }} title="Logger temps">Temps</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Time Mini Modal */}
      {logTask && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setLogTask(null); }}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h3 className="modal-title">Logger du temps</h3>
              <button className="modal-close" onClick={() => setLogTask(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginBottom: 12 }}>Tâche: <strong>{logTask.titre}</strong></p>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[0.5, 1, 2, 4, 8].map(h => (
                  <button key={h} className={`btn btn-sm ${logHours === String(h) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLogHours(String(h))}>{h}h</button>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Heures personnalisées</label>
                <input className="form-input" type="number" step="0.5" min="0.5" placeholder="Ex: 1.5" value={logHours} onChange={e => setLogHours(e.target.value)}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setLogTask(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={logTime} disabled={!logHours}>Logger {logHours ? logHours + 'h' : ''}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
