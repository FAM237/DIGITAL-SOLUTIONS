import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import Modal from '../components/Modal';
import { TaskDistributionChart } from '../components/Charts';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'; }
function isOverdue(d) { return d && new Date(d) < new Date(); }

const PRIO_META = { critique: { label: 'Critique', color: '#EF4444', bg: '#FEE2E2' }, haute: { label: 'Haute', color: '#F59E0B', bg: '#FEF3C7' }, moyenne: { label: 'Moyenne', color: '#3B82F6', bg: '#DBEAFE' }, basse: { label: 'Basse', color: '#10B981', bg: '#D1FAE5' } };
const STATUS_META = { a_faire: { label: 'À faire', cls: 'todo' }, en_cours: { label: 'En cours', cls: 'inprogress' }, termine: { label: 'Terminé', cls: 'done' } };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, isAdmin, user, mockProjects, setMockProjects, mockTasks, setMockTasks, mockTeams, mockUsers, addToast, uid, now, logActivity, addNotification } = useApp();
  const t = useT(lang);

  const project = mockProjects.find(p => p._id === id);
  const tasks   = mockTasks.filter(tk => tk.projetId === id);
  const team    = mockTeams.find(t => t._id === project?.equipeId);
  const teamMembers = mockUsers.filter(u => team?.membres?.includes(u.id));

  const [tab, setTab]         = useState('tasks');
  const [filterStatus, setFS] = useState('tous');
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ titre: '', description: '', assigneA: '', statut: 'a_faire', priorite: 'moyenne', dateEcheance: '', tempsEstime: '', tags: '' });
  const [commentText, setCommentText] = useState('');
  const [logHours, setLogHours] = useState('');
  const [showLogTime, setShowLogTime] = useState(null);
  const [progressEdit, setProgressEdit] = useState(false);
  const [newProgress, setNewProgress]   = useState(project?.progression || 0);

  if (!project) return (
    <div className="empty-state" style={{ marginTop: 40 }}>
      <div className="empty-title">Projet introuvable</div>
      <button className="btn btn-primary" onClick={() => navigate('/projects')}>← Retour</button>
    </div>
  );

  const doneTasks = tasks.filter(t => t.statut === 'termine').length;
  const inProg    = tasks.filter(t => t.statut === 'en_cours').length;
  const totalHours = tasks.reduce((s, t) => s + (t.tempsLoggue || 0), 0);
  const estimHours = tasks.reduce((s, t) => s + (t.tempsEstime || 0), 0);
  const canManage = isAdmin || team?.membres?.includes(user?.id);

  const filteredTasks = filterStatus === 'tous' ? tasks : tasks.filter(t => t.statut === filterStatus);
  const sortedTasks   = [...filteredTasks].sort((a, b) => ['critique','haute','moyenne','basse'].indexOf(a.priorite) - ['critique','haute','moyenne','basse'].indexOf(b.priorite));

  const pieData = [
    { name: 'À faire', value: tasks.filter(t => t.statut === 'a_faire').length },
    { name: 'En cours', value: inProg },
    { name: 'Terminé', value: doneTasks },
  ].filter(d => d.value > 0);

  function resetForm() { setForm({ titre: '', description: '', assigneA: '', statut: 'a_faire', priorite: 'moyenne', dateEcheance: '', tempsEstime: '', tags: '' }); }

  async function createTask(e) {
    e.preventDefault();
    if (!form.titre.trim()) { addToast(t('common.required'), 'error'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    const task = { _id: uid(), titre: form.titre, description: form.description, projetId: id, assigneA: form.assigneA || null, statut: form.statut, priorite: form.priorite, dateEcheance: form.dateEcheance || null, tempsEstime: form.tempsEstime ? parseFloat(form.tempsEstime) : null, tempsLoggue: 0, tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [], commentaires: [], dateFin: null };
    setMockTasks(prev => [...prev, task]);
    // Update progression
    const newTasks = [...mockTasks.filter(t => t.projetId === id), task];
    const pct = Math.round((newTasks.filter(t => t.statut === 'termine').length / newTasks.length) * 100);
    setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: pct } : p));
    if (form.assigneA && form.assigneA !== user?.id) addNotification(form.assigneA, 'task_assigned', `Vous avez été assigné à "${form.titre}"`, `/projects/${id}`);
    logActivity('a créé la tâche', form.titre, 'task');
    addToast(t('tasks.taskCreated'), 'success');
    setShowNew(false); resetForm(); setSaving(false);
  }

  async function updateTaskStatus(task, newStatus) {
    const updatedTask = { ...task, statut: newStatus, dateFin: newStatus === 'termine' ? now() : null };
    setMockTasks(prev => prev.map(t => t._id === task._id ? updatedTask : t));
    const allTasks = mockTasks.map(t => t._id === task._id ? updatedTask : t).filter(t => t.projetId === id);
    const pct = allTasks.length > 0 ? Math.round((allTasks.filter(t => t.statut === 'termine').length / allTasks.length) * 100) : 0;
    setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: pct } : p));
    logActivity(newStatus === 'termine' ? 'a terminé la tâche' : 'a mis à jour la tâche', task.titre, 'task');
    addToast(t('tasks.taskUpdated'), 'success');
  }

  async function editTask(e) {
    e.preventDefault(); setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    const updated = { ...showEdit, titre: form.titre, description: form.description, assigneA: form.assigneA || null, statut: form.statut, priorite: form.priorite, dateEcheance: form.dateEcheance || null, tempsEstime: form.tempsEstime ? parseFloat(form.tempsEstime) : null, tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [] };
    setMockTasks(prev => prev.map(t => t._id === showEdit._id ? updated : t));
    const allTasks = mockTasks.map(t => t._id === showEdit._id ? updated : t).filter(t => t.projetId === id);
    const pct = allTasks.length > 0 ? Math.round((allTasks.filter(t => t.statut === 'termine').length / allTasks.length) * 100) : 0;
    setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: pct } : p));
    logActivity('a modifié la tâche', form.titre, 'task');
    addToast(t('tasks.taskUpdated'), 'success');
    setShowEdit(null); resetForm(); setSaving(false);
  }

  async function deleteTask() {
    setMockTasks(prev => prev.filter(t => t._id !== showDel._id));
    const remaining = tasks.filter(t => t._id !== showDel._id);
    const pct = remaining.length > 0 ? Math.round((remaining.filter(t => t.statut === 'termine').length / remaining.length) * 100) : 0;
    setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: pct } : p));
    logActivity('a supprimé la tâche', showDel.titre, 'task');
    addToast(t('tasks.taskDeleted'), 'success');
    setShowDel(null);
  }

  function addComment(taskId) {
    if (!commentText.trim()) return;
    const comment = { id: uid(), auteurId: user?.id, texte: commentText, date: now() };
    setMockTasks(prev => prev.map(t => t._id === taskId ? { ...t, commentaires: [...(t.commentaires||[]), comment] } : t));
    if (showDetail?._id === taskId) setShowDetail(prev => ({ ...prev, commentaires: [...(prev.commentaires||[]), comment] }));
    logActivity('a commenté', showDetail?.titre || '', 'comment');
    addToast(lang === 'fr' ? 'Commentaire ajouté' : 'Comment added', 'success');
    setCommentText('');
  }

  function logTime(taskId) {
    const hrs = parseFloat(logHours);
    if (!hrs || hrs <= 0) return;
    setMockTasks(prev => prev.map(t => t._id === taskId ? { ...t, tempsLoggue: (t.tempsLoggue || 0) + hrs } : t));
    if (showDetail?._id === taskId) setShowDetail(prev => ({ ...prev, tempsLoggue: (prev.tempsLoggue || 0) + hrs }));
    logActivity(`a loggué ${hrs}h sur`, showDetail?.titre || '', 'time');
    addToast(`${hrs}h ${lang === 'fr' ? 'loggué(es)' : 'logged'}`, 'success');
    setLogHours(''); setShowLogTime(null);
  }

  const openEdit = (task) => { setForm({ titre: task.titre, description: task.description || '', assigneA: task.assigneA || '', statut: task.statut, priorite: task.priorite || 'moyenne', dateEcheance: task.dateEcheance ? task.dateEcheance.slice(0,10) : '', tempsEstime: task.tempsEstime || '', tags: (task.tags || []).join(', ') }); setShowEdit(task); };
  const openDetail = (task) => { setShowDetail(task); setCommentText(''); setLogHours(''); setShowLogTime(null); };

  const pm = PRIO_META[project.priorite] || PRIO_META.moyenne;
  const od = isOverdue(project.dateEcheance) && project.statut === 'actif';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← {lang === 'fr' ? 'Retour' : 'Back'}</button>
            <span style={{ color: 'var(--text3)' }}>/</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>{project.titre}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: project.couleur || 'var(--primary)' }}/>
            <h1 style={{ fontSize: '1.4rem' }}>{project.titre}</h1>
            <span className={`badge badge-${project.statut}`}>{project.statut === 'actif' ? 'Actif' : 'Archivé'}</span>
            <span className="prio-tag" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: '0.85rem', marginTop: 4 }}>{project.description}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/projects/${id}/kanban`} className="btn btn-secondary"> Kanban</Link>
          {canManage && <button className="btn btn-primary" onClick={() => { resetForm(); setShowNew(true); }}>+ {t('tasks.newTask')}</button>}
        </div>
      </div>

      {/* Stat Chips */}
      <div className="project-detail-chips">
        {[
          { label: `${tasks.length} tâches` },
          { label: `${doneTasks} terminées` },
          { label: `${project.progression || 0}% progression` },
          { label: `${totalHours}h / ${estimHours}h` },
          ...(project.budget ? [{ label: `${project.budget.toLocaleString()} FCFA` }] : []),
          ...(project.dateEcheance ? [{ label: `Échéance: ${fmtDate(project.dateEcheance)}`, danger: od }] : []),
          ...(team ? [{ label: team.nom }] : []),
        ].map((c, i) => (
          <div key={i} className={`detail-chip${c.danger ? ' chip-danger' : ''}`}>{c.label}</div>
        ))}
      </div>

      {/* Progress Bar with Edit */}
      <div className="progress-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text2)' }}>{lang === 'fr' ? 'Progression globale' : 'Overall progress'}</span>
          {isAdmin && !progressEdit && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => { setNewProgress(project.progression || 0); setProgressEdit(true); }}>{lang === 'fr' ? 'Modifier' : 'Edit'}</button>
          )}
          {progressEdit && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="range" min="0" max="100" value={newProgress} onChange={e => setNewProgress(parseInt(e.target.value))} style={{ width: 80 }}/>
              <span style={{ fontSize: '0.78rem', minWidth: 35 }}>{newProgress}%</span>
              <button className="btn btn-primary btn-sm" onClick={() => { setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: newProgress } : p)); setProgressEdit(false); addToast('Progression mise à jour', 'success'); }}>OK</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setProgressEdit(false)}>Annuler</button>
            </div>
          )}
        </div>
        <div className="progress progress-lg"><div className="progress-fill" style={{ width: `${project.progression||0}%`, background: project.couleur || 'var(--primary)' }}/></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text3)' }}>
            <span style={{ color: '#F59E0B' }}>● À faire: {tasks.filter(t => t.statut === 'a_faire').length}</span>
            <span style={{ color: '#3B82F6' }}>● En cours: {inProg}</span>
            <span style={{ color: '#10B981' }}>● Terminé: {doneTasks}</span>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: project.couleur || 'var(--primary)' }}>{project.progression || 0}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {[
          { key: 'tasks',   label: `Tâches (${tasks.length})` },
          { key: 'team',    label: `Équipe (${teamMembers.length})` },
          { key: 'stats',   label: 'Stats' },
        ].map(tb => <button key={tb.key} className={`tab-btn${tab === tb.key ? ' active' : ''}`} onClick={() => setTab(tb.key)}>{tb.label}</button>)}
      </div>

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <div className="filter-group">
              {[['tous','Tous'],['a_faire','À faire'],['en_cours','En cours'],['termine','Terminé']].map(([v,l]) => (
                <button key={v} className={`filter-btn${filterStatus === v ? ' active' : ''}`} onClick={() => setFS(v)}>{l}</button>
              ))}
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text3)', marginLeft: 'auto' }}>{filteredTasks.length} {lang === 'fr' ? 'tâche(s)' : 'task(s)'}</span>
          </div>

          {sortedTasks.length === 0 ? (
            <div className="empty-state"><div className="empty-title">{t('tasks.noTasks')}</div>{canManage && <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ {t('tasks.newTask')}</button>}</div>
          ) : (
            <div className="tasks-list">
              {sortedTasks.map(task => {
                const assignee = mockUsers.find(u => u.id === task.assigneA);
                const sm = STATUS_META[task.statut] || STATUS_META.a_faire;
                const pm2 = PRIO_META[task.priorite] || PRIO_META.moyenne;
                const od2 = isOverdue(task.dateEcheance) && task.statut !== 'termine';
                return (
                  <div key={task._id} className={`task-row${task.statut === 'termine' ? ' task-done' : ''}`}>
                    <div className="task-row-left">
                      <button className="task-check" style={{ borderColor: task.statut === 'termine' ? '#10B981' : 'var(--border2)', background: task.statut === 'termine' ? '#10B981' : 'transparent' }}
                        onClick={() => updateTaskStatus(task, task.statut === 'termine' ? 'en_cours' : 'termine')}>
                        {task.statut === 'termine' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                      </button>
                      <div className="task-row-body" onClick={() => openDetail(task)} style={{ cursor: 'pointer' }}>
                        <div className="task-row-title" style={{ textDecoration: task.statut === 'termine' ? 'line-through' : 'none' }}>{task.titre}</div>
                        <div className="task-row-meta">
                          {task.tags?.length > 0 && task.tags.map(tag => <span key={tag} className="task-tag">{tag}</span>)}
                          {task.commentaires?.length > 0 && <span className="task-meta-item">{task.commentaires.length} commentaire(s)</span>}
                          {task.tempsLoggue > 0 && <span className="task-meta-item">{task.tempsLoggue}h</span>}
                        </div>
                      </div>
                    </div>
                    <div className="task-row-right">
                      <span className="prio-tag" style={{ color: pm2.color, background: pm2.bg }}>{pm2.label}</span>
                      {task.dateEcheance && <span style={{ fontSize: '0.75rem', color: od2 ? 'var(--danger)' : 'var(--text3)', fontWeight: od2 ? 600 : 400 }}>{fmtDate(task.dateEcheance)}</span>}
                      {assignee && <div className="avatar avatar-sm" title={assignee.nom} style={{ background: 'var(--primary)' }}>{assignee.nom.charAt(0)}</div>}
                      <select className={`status-select status-${sm.cls}`} value={task.statut} onChange={e => updateTaskStatus(task, e.target.value)} onClick={e => e.stopPropagation()}>
                        <option value="a_faire">À faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="termine">Terminé</option>
                      </select>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(task)} title="Modifier">Modifier</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setShowLogTime(task._id); openDetail(task); }} title="Logger temps">Temps</button>
                          {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => setShowDel(task)}>Supprimer</button>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {tab === 'team' && (
        <div>
          {team ? (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><span className="card-title">{team.nom}</span></div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text3)', marginBottom: 16 }}>{team.description}</p>
                <div className="team-members-grid">
                  {teamMembers.map(m => {
                    const mt = mockTasks.filter(t => t.projetId === id && t.assigneA === m.id);
                    return (
                      <div key={m.id} className="member-card">
                        <div className={`avatar member-avatar ${m.role === 'admin' ? 'avatar-admin' : ''}`} style={{ background: m.role === 'admin' ? '#F59E0B' : 'var(--primary)' }}>{m.nom.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.nom} {m.id === user?.id && <span className="badge-you">moi</span>}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{m.poste || m.role}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>{mt.length} tâche(s) · {mt.filter(t => t.statut === 'termine').length} terminée(s)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : <div className="empty-state"><div className="empty-title">Aucune équipe assignée</div></div>}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card"><div className="card-header"><span className="card-title">Distribution des tâches</span></div><TaskDistributionChart data={pieData}/></div>
          <div className="card">
            <div className="card-header"><span className="card-title">Informations clés</span></div>
            <div className="stats-info-list">
              {[
                { l: 'Total tâches', v: tasks.length },
                { l: 'À faire', v: tasks.filter(t => t.statut === 'a_faire').length, c: '#F59E0B' },
                { l: 'En cours', v: inProg, c: '#3B82F6' },
                { l: 'Terminées', v: doneTasks, c: '#10B981' },
                { l: 'Heures estimées', v: `${estimHours}h` },
                { l: 'Heures loggées', v: `${totalHours}h`, c: totalHours > estimHours ? '#EF4444' : '#10B981' },
                { l: 'Membres équipe', v: teamMembers.length },
                ...(project.budget ? [{ l: 'Budget', v: `${project.budget.toLocaleString()} FCFA` }] : []),
                { l: 'Créé le', v: fmtDate(project.dateCreation) },
                ...(project.dateEcheance ? [{ l: 'Échéance', v: fmtDate(project.dateEcheance), c: od ? '#EF4444' : undefined }] : []),
              ].map((s, i) => (
                <div key={i} className="sys-stat-row">
                  <span style={{ color: 'var(--text2)' }}>{s.l}</span>
                  <strong style={{ color: s.c || 'var(--text)' }}>{s.v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {showDetail && (
        <Modal title={showDetail.titre} onClose={() => setShowDetail(null)} size="lg"
          footer={<button className="btn btn-secondary" onClick={() => setShowDetail(null)}>{t('common.close')}</button>}>
          <TaskDetailView task={showDetail} users={mockUsers} t={t} lang={lang} commentText={commentText} setCommentText={setCommentText} addComment={addComment} logHours={logHours} setLogHours={setLogHours} logTime={logTime} showLogTime={showLogTime === showDetail._id} setShowLogTime={(v) => setShowLogTime(v ? showDetail._id : null)} canManage={canManage}/>
        </Modal>
      )}

      {/* NEW TASK MODAL */}
      {showNew && (
        <Modal title={t('tasks.newTask')} onClose={() => { setShowNew(false); resetForm(); }} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => { setShowNew(false); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={createTask} disabled={saving}>{saving ? t('common.loading') : t('common.add')}</button></>}>
          <TaskForm form={form} setForm={setForm} t={t} lang={lang} members={teamMembers}/>
        </Modal>
      )}

      {/* EDIT TASK MODAL */}
      {showEdit && (
        <Modal title={`${t('common.edit')}: ${showEdit.titre}`} onClose={() => { setShowEdit(null); resetForm(); }} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => { setShowEdit(null); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={editTask} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button></>}>
          <TaskForm form={form} setForm={setForm} t={t} lang={lang} members={teamMembers} showStatus/>
        </Modal>
      )}

      {/* DELETE TASK MODAL */}
      {showDel && (
        <Modal title={t('common.confirmation')} onClose={() => setShowDel(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowDel(null)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={deleteTask}>{t('common.delete')}</button></>}>
          <p style={{ fontSize: '0.9rem' }}>Supprimer la tâche <strong>"{showDel.titre}"</strong> ?</p>
        </Modal>
      )}
    </div>
  );
}

function TaskDetailView({ task, users, t, lang, commentText, setCommentText, addComment, logHours, setLogHours, logTime, showLogTime, setShowLogTime, canManage }) {
  const assignee = users.find(u => u.id === task.assigneA);
  const pm = PRIO_META[task.priorite] || PRIO_META.moyenne;
  const sm = STATUS_META[task.statut] || STATUS_META.a_faire;
  const od = isOverdue(task.dateEcheance) && task.statut !== 'termine';
  const progress = task.tempsEstime > 0 ? Math.min(100, Math.round((task.tempsLoggue / task.tempsEstime) * 100)) : 0;

  return (
    <div>
      <div className="task-detail-grid">
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className={`status-badge status-${sm.cls}`}>{sm.label}</span>
            <span className="prio-tag" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span>
            {task.tags?.map(tag => <span key={tag} className="task-tag">{tag}</span>)}
          </div>
          {task.description && <p style={{ fontSize: '0.88rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>{task.description}</p>}
          <div className="task-detail-meta">
            {assignee && <div className="tdm-row"><span>Assigné à</span><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><div className="avatar avatar-sm">{assignee.nom.charAt(0)}</div><span>{assignee.nom}</span></div></div>}
            {task.dateEcheance && <div className="tdm-row" style={{ color: od ? 'var(--danger)' : undefined }}><span>Échéance</span><strong>{new Date(task.dateEcheance).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</strong></div>}
            {task.dateFin && <div className="tdm-row"><span>Terminé le</span><span>{new Date(task.dateFin).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span></div>}
          </div>
        </div>
        <div>
          <div className="time-tracking-box">
            <div className="ttb-title">Suivi du temps</div>
            <div className="ttb-stats">
              <div><div className="ttb-val">{task.tempsEstime || 0}h</div><div className="ttb-lbl">Estimé</div></div>
              <div><div className="ttb-val" style={{ color: 'var(--primary)' }}>{task.tempsLoggue || 0}h</div><div className="ttb-lbl">Loggué</div></div>
              <div><div className="ttb-val" style={{ color: (task.tempsLoggue || 0) > (task.tempsEstime || 0) ? 'var(--danger)' : 'var(--success)' }}>{Math.max(0, (task.tempsEstime || 0) - (task.tempsLoggue || 0))}h</div><div className="ttb-lbl">Restant</div></div>
            </div>
            {task.tempsEstime > 0 && (
              <div className="progress" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${progress}%`, background: progress > 100 ? 'var(--danger)' : 'var(--primary)' }}/>
              </div>
            )}
            {canManage && (
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowLogTime(!showLogTime)}>
                + Logger du temps
              </button>
            )}
            {showLogTime && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input className="form-input" type="number" step="0.5" min="0.5" placeholder="Ex: 2.5" value={logHours} onChange={e => setLogHours(e.target.value)} style={{ flex: 1 }}/>
                <button className="btn btn-primary btn-sm" onClick={() => logTime(task._id)}>Ajouter</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="comments-section">
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>{t('tasks.comments')} ({task.commentaires?.length || 0})</h4>
        {task.commentaires?.length === 0 && <p style={{ fontSize: '0.83rem', color: 'var(--text3)', marginBottom: 12 }}>Aucun commentaire pour l'instant.</p>}
        {(task.commentaires || []).map(c => {
          const author = users.find(u => u.id === c.auteurId);
          return (
            <div key={c.id} className="comment-item">
              <div className="avatar avatar-sm">{author?.nom?.charAt(0) || '?'}</div>
              <div className="comment-body">
                <div className="comment-header">
                  <span className="comment-author">{author?.nom || 'Inconnu'}</span>
                  <span className="comment-date">{new Date(c.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="comment-text">{c.texte}</div>
              </div>
            </div>
          );
        })}
        {canManage && (
          <div className="comment-input-row">
            <input className="form-input" placeholder={t('tasks.addComment')} value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment(task._id)}/>
            <button className="btn btn-primary btn-sm" onClick={() => addComment(task._id)} disabled={!commentText.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskForm({ form, setForm, t, lang, members, showStatus }) {
  return (
    <div>
      <div className="form-group">
        <label className="form-label">{lang === 'fr' ? 'Titre de la tâche' : 'Task title'} *</label>
        <input className="form-input" required placeholder="Ex: Créer la maquette..." value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))}/>
      </div>
      <div className="form-group">
        <label className="form-label">{lang === 'fr' ? 'Description' : 'Description'}</label>
        <textarea className="form-textarea" rows={3} placeholder="Détails de la tâche..." value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}/>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">{t('tasks.assignTo')}</label>
          <select className="form-select" value={form.assigneA} onChange={e => setForm(p => ({...p, assigneA: e.target.value}))}>
            <option value="">-- {lang === 'fr' ? 'Non assigné' : 'Unassigned'} --</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('tasks.priority')}</label>
          <select className="form-select" value={form.priorite} onChange={e => setForm(p => ({...p, priorite: e.target.value}))}>
            <option value="basse">Basse</option>
            <option value="moyenne">Moyenne</option>
            <option value="haute">Haute</option>
            <option value="critique">Critique</option>
          </select>
        </div>
        {showStatus && (
          <div className="form-group">
            <label className="form-label">{lang === 'fr' ? 'Statut' : 'Status'}</label>
            <select className="form-select" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}>
              <option value="a_faire">À faire</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">{t('tasks.dueDate')}</label>
          <input className="form-input" type="date" value={form.dateEcheance} onChange={e => setForm(p => ({...p, dateEcheance: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">{t('tasks.estimatedTime')}</label>
          <input className="form-input" type="number" step="0.5" min="0" placeholder="Ex: 8" value={form.tempsEstime} onChange={e => setForm(p => ({...p, tempsEstime: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">{t('tasks.tags')} <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>(séparés par virgule)</span></label>
          <input className="form-input" placeholder="design, frontend, api..." value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))}/>
        </div>
      </div>
    </div>
  );
}
