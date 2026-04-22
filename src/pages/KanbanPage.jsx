// KanbanPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import Modal from '../components/Modal';

const COLUMNS = [
  { key: 'a_faire',  label: 'À faire',   color: '#F59E0B' },
  { key: 'en_cours', label: 'En cours',  color: '#3B82F6' },
  { key: 'termine',  label: 'Terminé',   color: '#10B981' },
];
const PRIO_COLORS = { critique: '#EF4444', haute: '#F59E0B', moyenne: '#3B82F6', basse: '#10B981' };

export default function KanbanPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, isAdmin, user, mockProjects, setMockProjects, mockTasks, setMockTasks, mockTeams, mockUsers, addToast, uid, now, logActivity } = useApp();
  const t = useT(lang);

  const project = mockProjects.find(p => p._id === id);
  const tasks   = mockTasks.filter(tk => tk.projetId === id);
  const team    = project ? mockTeams.find(t => t._id === project.equipeId) : null;
  const members = mockUsers.filter(u => team?.membres?.includes(u.id));
  const canManage = isAdmin || team?.membres?.includes(user?.id);

  const [dragged, setDragged]  = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showNew, setShowNew]  = useState(null); // column key
  const [form, setForm]        = useState({ titre: '', description: '', assigneA: '', priorite: 'moyenne', dateEcheance: '', tempsEstime: '' });
  const [saving, setSaving]    = useState(false);

  if (!project) return <div className="empty-state"><div className="empty-title">Projet introuvable</div><button className="btn btn-primary" onClick={() => navigate('/projects')}>← Retour</button></div>;

  function moveTask(taskId, newStatus) {
    const updated = mockTasks.map(t => t._id === taskId ? { ...t, statut: newStatus, dateFin: newStatus === 'termine' ? now() : null } : t);
    setMockTasks(updated);
    const proj = updated.filter(t => t.projetId === id);
    const pct  = proj.length > 0 ? Math.round((proj.filter(t => t.statut === 'termine').length / proj.length) * 100) : 0;
    setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: pct } : p));
    logActivity('a déplacé une tâche', `vers "${COLUMNS.find(c => c.key === newStatus)?.label}"`, 'task');
    addToast(t('tasks.taskUpdated'), 'success');
  }

  async function createTask(e) {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    const task = { _id: uid(), titre: form.titre, description: form.description, projetId: id, assigneA: form.assigneA || null, statut: showNew, priorite: form.priorite, dateEcheance: form.dateEcheance || null, tempsEstime: form.tempsEstime ? parseFloat(form.tempsEstime) : null, tempsLoggue: 0, tags: [], commentaires: [], dateFin: null };
    const updated = [...mockTasks, task];
    setMockTasks(updated);
    const proj = updated.filter(t => t.projetId === id);
    const pct  = Math.round((proj.filter(t => t.statut === 'termine').length / proj.length) * 100);
    setMockProjects(prev => prev.map(p => p._id === id ? { ...p, progression: pct } : p));
    logActivity('a créé la tâche', form.titre, 'task');
    addToast(t('tasks.taskCreated'), 'success');
    setShowNew(null); setForm({ titre: '', description: '', assigneA: '', priorite: 'moyenne', dateEcheance: '', tempsEstime: '' }); setSaving(false);
  }

  const isOverdue = (d) => d && new Date(d) < new Date();

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${id}`)}>← {project.titre}</button>
          </div>
          <h1>Kanban Board</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>{tasks.length} tâche(s) · {project.progression || 0}% complété</p>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.statut === col.key);
          return (
            <div key={col.key} className={`kanban-col${dragOver === col.key ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); if (dragged && dragged.statut !== col.key) moveTask(dragged._id, col.key); setDragged(null); setDragOver(null); }}>
              <div className="kanban-col-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }}/>
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-col-count">{colTasks.length}</span>
                </div>
                {canManage && (
                  <button className="kanban-add-btn" onClick={() => setShowNew(col.key)} title="Ajouter une tâche">+</button>
                )}
              </div>
              <div className="kanban-cards">
                {colTasks.map(task => {
                  const assignee = mockUsers.find(u => u.id === task.assigneA);
                  const od = isOverdue(task.dateEcheance) && task.statut !== 'termine';
                  return (
                    <div key={task._id} className="kanban-card" draggable={canManage} onDragStart={() => setDragged(task)} onDragEnd={() => setDragged(null)}>
                      <div className="kanban-card-prio" style={{ background: PRIO_COLORS[task.priorite] || '#3B82F6' }}/>
                      <div className="kanban-card-title">{task.titre}</div>
                      {task.description && <div className="kanban-card-desc">{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</div>}
                      {task.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                          {task.tags.map(tag => <span key={tag} className="task-tag">{tag}</span>)}
                        </div>
                      )}
                      <div className="kanban-card-footer">
                        <div style={{ display: 'flex', gap: 8, fontSize: '0.75rem', color: 'var(--text3)' }}>
                          {task.commentaires?.length > 0 && <span>[C] {task.commentaires.length}</span>}
                          {task.tempsLoggue > 0 && <span>[T] {task.tempsLoggue}h</span>}
                          {task.dateEcheance && <span style={{ color: od ? 'var(--danger)' : 'var(--text3)', fontWeight: od ? 600 : 400 }}>{od ? '[!] ' : ''}[D] {new Date(task.dateEcheance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
                        </div>
                        {assignee && <div className="avatar kanban-card-avatar" title={assignee.nom}>{assignee.nom.charAt(0)}</div>}
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="kanban-empty">
                    <span>Glissez une tâche ici</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <Modal title={`+ Nouvelle tâche — ${COLUMNS.find(c => c.key === showNew)?.label}`} onClose={() => setShowNew(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowNew(null)}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={createTask} disabled={saving}>{saving ? '...' : t('common.add')}</button></>}>
          <div>
            <div className="form-group"><label className="form-label">Titre *</label><input className="form-input" required autoFocus value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))} placeholder="Titre de la tâche..."/></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}/></div>
            <div className="form-row-2">
              <div className="form-group"><label className="form-label">Assigné à</label>
                <select className="form-select" value={form.assigneA} onChange={e => setForm(p => ({...p, assigneA: e.target.value}))}>
                  <option value="">Non assigné</option>{members.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Priorité</label>
                <select className="form-select" value={form.priorite} onChange={e => setForm(p => ({...p, priorite: e.target.value}))}>
                  <option value="basse">Basse</option><option value="moyenne">Moyenne</option><option value="haute">Haute</option><option value="critique">Critique</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Échéance</label><input className="form-input" type="date" value={form.dateEcheance} onChange={e => setForm(p => ({...p, dateEcheance: e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Temps estimé (h)</label><input className="form-input" type="number" step="0.5" value={form.tempsEstime} onChange={e => setForm(p => ({...p, tempsEstime: e.target.value}))}/></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
