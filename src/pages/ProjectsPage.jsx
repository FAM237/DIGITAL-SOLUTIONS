import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import Modal from '../components/Modal';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }
function isOverdue(d) { return d && new Date(d) < new Date(); }

const PRIO_META = {
  critique: { label: 'Critique', color: '#EF4444', bg: '#FEE2E2' },
  haute:    { label: 'Haute',    color: '#F59E0B', bg: '#FEF3C7' },
  moyenne:  { label: 'Moyenne',  color: '#3B82F6', bg: '#DBEAFE' },
  basse:    { label: 'Basse',    color: '#10B981', bg: '#D1FAE5' },
};

const COLORS_LIST = ['#0f766e','#7c3aed','#2563eb','#d97706','#db2777','#059669','#dc2626','#0891b2','#7c2d12','#1d4ed8'];

export default function ProjectsPage() {
  const { lang, isAdmin, user, mockProjects, setMockProjects, mockTasks, mockTeams, mockUsers, addToast, uid, now, logActivity, addNotification } = useApp();
  const t  = useT(lang);
  const navigate = useNavigate();

  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('tous');
  const [sortBy,    setSortBy]    = useState('date');
  const [viewMode,  setViewMode]  = useState('grid');
  const [showNew,   setShowNew]   = useState(false);
  const [showEdit,  setShowEdit]  = useState(null);
  const [showDel,   setShowDel]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [form,      setForm]      = useState({ titre: '', description: '', equipeId: '', priorite: 'moyenne', dateEcheance: '', budget: '', couleur: '#0f766e', statut: 'actif' });

  // For non-admin: filter to user's teams
  const visibleProjects = useMemo(() => {
    if (isAdmin) return mockProjects;
    const myTeamIds = mockTeams.filter(t => t.membres?.includes(user?.id)).map(t => t._id);
    return mockProjects.filter(p => p.equipeId && myTeamIds.includes(p.equipeId));
  }, [mockProjects, mockTeams, user, isAdmin]);

  const displayed = useMemo(() => {
    let list = visibleProjects;
    if (search) list = list.filter(p => p.titre.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'actif') list = list.filter(p => p.statut === 'actif');
    else if (filter === 'archive') list = list.filter(p => p.statut === 'archive');
    if (sortBy === 'titre')      list = [...list].sort((a, b) => a.titre.localeCompare(b.titre));
    else if (sortBy === 'date')  list = [...list].sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
    else if (sortBy === 'prio')  list = [...list].sort((a, b) => ['critique','haute','moyenne','basse'].indexOf(a.priorite) - ['critique','haute','moyenne','basse'].indexOf(b.priorite));
    else if (sortBy === 'progress') list = [...list].sort((a, b) => (b.progression||0) - (a.progression||0));
    return list;
  }, [visibleProjects, search, filter, sortBy]);

  function getTaskStats(pid) {
    const tasks = mockTasks.filter(t => t.projetId === pid);
    return { total: tasks.length, done: tasks.filter(t => t.statut === 'termine').length, inProgress: tasks.filter(t => t.statut === 'en_cours').length };
  }

  function resetForm() { setForm({ titre: '', description: '', equipeId: '', priorite: 'moyenne', dateEcheance: '', budget: '', couleur: '#0f766e', statut: 'actif' }); setFormErr(''); }

  async function handleCreate(e) {
    e.preventDefault(); setFormErr('');
    if (!form.titre.trim()) { setFormErr(t('common.required')); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const proj = { _id: uid(), titre: form.titre, description: form.description, equipeId: form.equipeId || null, priorite: form.priorite, dateEcheance: form.dateEcheance || null, budget: form.budget ? parseInt(form.budget) : null, couleur: form.couleur, statut: 'actif', dateCreation: now(), progression: 0 };
    setMockProjects(prev => [proj, ...prev]);
    // Notify team members
    if (form.equipeId) {
      const team = mockTeams.find(t => t._id === form.equipeId);
      team?.membres?.forEach(mid => { if (mid !== user?.id) addNotification(mid, 'project_update', `Nouveau projet "${form.titre}" assigné à votre équipe`, `/projects/${proj._id}`); });
    }
    logActivity('a créé le projet', form.titre, 'project');
    addToast(t('projects.projectCreated'), 'success');
    setShowNew(false); resetForm(); setSaving(false);
    navigate(`/projects/${proj._id}`);
  }

  async function handleEdit(e) {
    e.preventDefault(); setFormErr('');
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setMockProjects(prev => prev.map(p => p._id === showEdit._id ? { ...p, titre: form.titre, description: form.description, equipeId: form.equipeId || null, priorite: form.priorite, dateEcheance: form.dateEcheance || null, budget: form.budget ? parseInt(form.budget) : null, couleur: form.couleur, statut: form.statut } : p));
    logActivity('a modifié le projet', form.titre, 'project');
    addToast(t('projects.projectUpdated'), 'success');
    setShowEdit(null); resetForm(); setSaving(false);
  }

  async function handleDelete() {
    setMockProjects(prev => prev.filter(p => p._id !== showDel._id));
    logActivity('a supprimé le projet', showDel.titre, 'project');
    addToast(t('projects.projectDeleted'), 'success');
    setShowDel(null);
  }

  const openEdit = (p, e) => { e?.stopPropagation(); setForm({ titre: p.titre, description: p.description || '', equipeId: p.equipeId || '', priorite: p.priorite || 'moyenne', dateEcheance: p.dateEcheance ? p.dateEcheance.slice(0,10) : '', budget: p.budget || '', couleur: p.couleur || '#0f766e', statut: p.statut }); setShowEdit(p); setFormErr(''); };

  const canManage = (p) => isAdmin || p.equipeId && mockTeams.find(t => t._id === p.equipeId)?.membres?.includes(user?.id);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('projects.title')}</h1>
          <p className="page-subtitle">{displayed.length} {t('projects.total')}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowNew(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            {t('projects.newProject')}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-input">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input" placeholder={t('projects.search')} value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="filter-group">
          {[['tous','Tous'],['actif','Actifs'],['archive','Archivés']].map(([v,l]) => (
            <button key={v} className={`filter-btn${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date">{t('projects.sortDate')}</option>
          <option value="titre">{t('projects.sortTitle')}</option>
          <option value="prio">{t('projects.priority')}</option>
          <option value="progress">{t('projects.sortProgress')}</option>
        </select>
        <div className="view-toggle">
          <button className={`view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grille">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="Liste">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7l1 12a2 2 0 002 2h12a2 2 0 002-2l1-12"/></svg></div>
          <div className="empty-title">{t('projects.noProjects')}</div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ {t('projects.createProject')}</button>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid-3">
          {displayed.map(p => {
            const s = getTaskStats(p._id);
            const team = mockTeams.find(t => t._id === p.equipeId);
            const pm  = PRIO_META[p.priorite] || PRIO_META.moyenne;
            const od  = isOverdue(p.dateEcheance) && p.statut === 'actif';
            return (
              <div key={p._id} className="project-card" onClick={() => navigate(`/projects/${p._id}`)}>
                <div className="project-card-accent" style={{ background: p.couleur || 'var(--primary)' }}/>
                <div className="project-card-top">
                  <span className="project-card-title">{p.titre}</span>
                  <span className={`badge badge-${p.statut}`}>{p.statut === 'actif' ? t('projects.statusActive') : t('projects.statusArchived')}</span>
                </div>
                <div className="project-card-desc">{p.description || t('common.noDescription')}</div>
                <div className="project-card-tags">
                  <span className="prio-tag" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span>
                  {team && <span className="team-tag">{team.nom}</span>}
                </div>
                <div className="project-card-meta">
                  <span>{s.total} {t('projects.tasks')}</span>
                  {p.dateEcheance && <span style={{ color: od ? 'var(--danger)' : 'var(--text3)', fontSize: '0.75rem' }}>{fmtDate(p.dateEcheance)}</span>}
                  <span style={{ fontWeight: 600 }}>{p.progression || 0}%</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${p.progression || 0}%`, background: p.couleur || 'var(--primary)' }}/></div>
                {canManage(p) && (
                  <div className="project-card-actions" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/projects/${p._id}/kanban`); }}>Kanban</button>
                    {isAdmin && <>
                      <button className="btn btn-ghost btn-sm" onClick={e => openEdit(p, e)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setShowDel(p); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Projet</th><th>Statut</th><th>Priorité</th><th>Équipe</th><th>Progression</th><th>Échéance</th><th>Tâches</th><th>Actions</th></tr></thead>
            <tbody>
              {displayed.map(p => {
                const s = getTaskStats(p._id);
                const team = mockTeams.find(t => t._id === p.equipeId);
                const pm  = PRIO_META[p.priorite] || PRIO_META.moyenne;
                const od  = isOverdue(p.dateEcheance) && p.statut === 'actif';
                return (
                  <tr key={p._id} onClick={() => navigate(`/projects/${p._id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.couleur || 'var(--primary)', flexShrink: 0 }}/>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.titre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{p.description?.slice(0, 40) || ''}...</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${p.statut}`}>{p.statut === 'actif' ? 'Actif' : 'Archivé'}</span></td>
                    <td><span className="prio-tag" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{team?.nom || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 999, minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${p.progression||0}%`, background: p.couleur || 'var(--primary)', borderRadius: 999 }}/>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 30 }}>{p.progression||0}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: od ? 'var(--danger)' : 'var(--text3)', fontWeight: od ? 600 : 400 }}>{fmtDate(p.dateEcheance)}</td>
                    <td style={{ fontSize: '0.82rem' }}>{s.total} ({s.done})</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${p._id}/kanban`)}>Kanban</button>
                        {isAdmin && <>
                          <button className="btn btn-ghost btn-sm" onClick={e => openEdit(p, e)}>{t('common.edit')}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setShowDel(p)}>{t('common.delete')}</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNew && (
        <Modal title={t('projects.createProject')} onClose={() => { setShowNew(false); resetForm(); }} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => { setShowNew(false); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? t('projects.creating') : t('projects.createBtn')}</button></>}>
          <ProjectForm form={form} setForm={setForm} formErr={formErr} t={t} lang={lang} teams={mockTeams} isNew/>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <Modal title={t('projects.editProject')} onClose={() => { setShowEdit(null); resetForm(); }} size="lg"
          footer={<><button className="btn btn-secondary" onClick={() => { setShowEdit(null); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? t('projects.creating') : t('projects.saveChanges')}</button></>}>
          <ProjectForm form={form} setForm={setForm} formErr={formErr} t={t} lang={lang} teams={mockTeams} showStatus/>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {showDel && (
        <Modal title={t('common.confirmation')} onClose={() => setShowDel(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowDel(null)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={handleDelete}>{t('common.delete')}</button></>}>
          <p style={{ fontSize: '0.9rem' }}>{t('projects.confirmDelete')} <strong>"{showDel.titre}"</strong> {t('projects.andAllTasks')}</p>
        </Modal>
      )}
    </div>
  );
}

function ProjectForm({ form, setForm, formErr, t, lang, teams, isNew, showStatus }) {
  const COLORS_LIST = ['#0f766e','#7c3aed','#2563eb','#d97706','#db2777','#059669','#dc2626','#0891b2'];
  return (
    <div>
      <div className="form-row-2">
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">{t('projects.titleLabel')} *</label>
          <input className="form-input" required placeholder={t('projects.titlePlaceholder')} value={form.titre} onChange={e => setForm(p => ({...p, titre: e.target.value}))}/>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('projects.descLabel')}</label>
        <textarea className="form-textarea" rows={3} placeholder={t('projects.descPlaceholder')} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}/>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">{t('projects.teamLabel')}</label>
          <select className="form-select" value={form.equipeId} onChange={e => setForm(p => ({...p, equipeId: e.target.value}))}>
            <option value="">{t('projects.teamPlaceholder')}</option>
            {teams.map(team => <option key={team._id} value={team._id}>{team.nom}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('projects.priority')}</label>
          <select className="form-select" value={form.priorite} onChange={e => setForm(p => ({...p, priorite: e.target.value}))}>
            <option value="basse">{t('projects.prioLow')}</option>
            <option value="moyenne">{t('projects.prioMedium')}</option>
            <option value="haute">{t('projects.prioHigh')}</option>
            <option value="critique">{t('projects.prioCritical')}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('projects.deadline')}</label>
          <input className="form-input" type="date" value={form.dateEcheance} onChange={e => setForm(p => ({...p, dateEcheance: e.target.value}))}/>
        </div>
        <div className="form-group">
          <label className="form-label">{t('projects.budget')}</label>
          <input className="form-input" type="number" placeholder="0" value={form.budget} onChange={e => setForm(p => ({...p, budget: e.target.value}))}/>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('projects.color')}</label>
        <div className="color-picker">
          {COLORS_LIST.map(c => (
            <button key={c} type="button" className={`color-dot${form.couleur === c ? ' selected' : ''}`} style={{ background: c }} onClick={() => setForm(p => ({...p, couleur: c}))}/>
          ))}
        </div>
      </div>
      {showStatus && (
        <div className="form-group">
          <label className="form-label">{t('projects.status')}</label>
          <select className="form-select" value={form.statut} onChange={e => setForm(p => ({...p, statut: e.target.value}))}>
            <option value="actif">{t('projects.statusActive')}</option>
            <option value="archive">{t('projects.statusArchived')}</option>
          </select>
        </div>
      )}
      {formErr && <div className="form-error">{formErr}</div>}
    </div>
  );
}
