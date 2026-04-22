import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import Modal from '../components/Modal';

export default function TeamsPage() {
  const { lang, isAdmin, user, mockTeams, setMockTeams, mockUsers, mockProjects, mockTasks, addToast, uid, now, logActivity } = useApp();
  const t = useT(lang);

  const [showNew,   setShowNew]  = useState(false);
  const [showEdit,  setShowEdit] = useState(null);
  const [showDel,   setShowDel]  = useState(null);
  const [showDetail,setShowDetail] = useState(null);
  const [saving,    setSaving]   = useState(false);
  const [formErr,   setFormErr]  = useState('');
  const [form, setForm]          = useState({ nom: '', description: '', membres: [] });

  function resetForm() { setForm({ nom: '', description: '', membres: [] }); setFormErr(''); }

  async function handleCreate(e) {
    e.preventDefault(); setFormErr('');
    if (!form.nom.trim()) { setFormErr(t('common.required')); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const team = { _id: uid(), nom: form.nom, description: form.description, membres: form.membres, membresInfo: mockUsers.filter(u => form.membres.includes(u.id)), dateCreation: now() };
    setMockTeams(prev => [...prev, team]);
    logActivity('a créé l\'équipe', form.nom, 'project');
    addToast(t('teams.teamCreated'), 'success');
    setShowNew(false); resetForm(); setSaving(false);
  }

  async function handleEdit(e) {
    e.preventDefault(); setFormErr('');
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setMockTeams(prev => prev.map(tm => tm._id === showEdit._id ? { ...tm, nom: form.nom, description: form.description, membres: form.membres, membresInfo: mockUsers.filter(u => form.membres.includes(u.id)) } : tm));
    logActivity('a modifié l\'équipe', form.nom, 'project');
    addToast(t('teams.teamUpdated'), 'success');
    setShowEdit(null); resetForm(); setSaving(false);
  }

  async function handleDelete() {
    setMockTeams(prev => prev.filter(tm => tm._id !== showDel._id));
    logActivity('a supprimé l\'équipe', showDel.nom, 'project');
    addToast(t('teams.teamDeleted'), 'success');
    setShowDel(null);
  }

  const openEdit  = (tm) => { setForm({ nom: tm.nom, description: tm.description || '', membres: tm.membres || [] }); setShowEdit(tm); setFormErr(''); };
  const toggleMember = (uid) => setForm(p => ({ ...p, membres: p.membres.includes(uid) ? p.membres.filter(m => m !== uid) : [...p.membres, uid] }));

  const myTeams = isAdmin ? mockTeams : mockTeams.filter(tm => tm.membres?.includes(user?.id));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('teams.title')}</h1>
          <p className="page-subtitle">{myTeams.length} {lang === 'fr' ? 'équipe(s)' : 'team(s)'}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowNew(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            {t('teams.newTeam')}
          </button>
        )}
      </div>

      {myTeams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
          <div className="empty-title">{t('teams.noTeams')}</div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setShowNew(true)}>{t('teams.createFirst')}</button>}
        </div>
      ) : (
        <div className="grid-3">
          {myTeams.map(team => {
            const teamProjects = mockProjects.filter(p => p.equipeId === team._id);
            const teamTasks    = mockTasks.filter(t => teamProjects.some(p => p._id === t.projetId));
            const doneTasks    = teamTasks.filter(t => t.statut === 'termine').length;
            const isMember     = team.membres?.includes(user?.id);
            return (
              <div key={team._id} className="team-card" onClick={() => setShowDetail(team)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div className="team-name">{team.nom}</div>
                    {isMember && !isAdmin && <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Membre</span>}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(team)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setShowDel(team)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="team-desc">{team.description || t('common.noDescription')}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text3)', margin: '10px 0', flexWrap: 'wrap' }}>
                  <span>{teamProjects.length} projet(s)</span>
                  <span>{teamTasks.length} tâche(s)</span>
                  <span>{doneTasks} terminée(s)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="avatar-group">
                    {(team.membresInfo || mockUsers.filter(u => team.membres?.includes(u.id))).slice(0, 5).map(m => (
                      <div key={m.id} className="avatar avatar-sm" title={m.nom} style={{ background: m.role === 'admin' ? '#F59E0B' : 'var(--primary)' }}>{m.nom?.charAt(0)}</div>
                    ))}
                    {(team.membres || []).length > 5 && <div className="avatar avatar-sm" style={{ background: 'var(--border2)', color: 'var(--text3)' }}>+{(team.membres || []).length - 5}</div>}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{(team.membres || []).length} {t('teams.membersCount')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TEAM DETAIL */}
      {showDetail && (
        <Modal title={showDetail.nom} onClose={() => setShowDetail(null)} size="lg"
          footer={<button className="btn btn-secondary" onClick={() => setShowDetail(null)}>{t('common.close')}</button>}>
          <div>
            <p style={{ color: 'var(--text3)', marginBottom: 16 }}>{showDetail.description || t('common.noDescription')}</p>
            <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Membres ({(showDetail.membres || []).length})</h4>
            <div className="team-members-grid" style={{ marginBottom: 20 }}>
              {mockUsers.filter(u => showDetail.membres?.includes(u.id)).map(m => {
                const mTasks = mockTasks.filter(t => t.assigneA === m.id && mockProjects.filter(p => p.equipeId === showDetail._id).some(p => p._id === t.projetId));
                return (
                  <div key={m.id} className="member-card">
                    <div className={`avatar member-avatar ${m.role === 'admin' ? 'avatar-admin' : ''}`} style={{ background: m.role === 'admin' ? '#F59E0B' : 'var(--primary)' }}>{m.nom.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.nom} {m.id === user?.id && <span className="badge-you">moi</span>}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text3)' }}>{m.poste || m.role}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>{mTasks.length} tâche(s)</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>Projets associés</h4>
            <div className="project-list">
              {mockProjects.filter(p => p.equipeId === showDetail._id).map(p => (
                <div key={p._id} className="project-list-item">
                  <div className="pli-color" style={{ background: p.couleur || 'var(--primary)' }}/>
                  <div className="pli-body">
                    <div className="pli-title">{p.titre}</div>
                    <div className="progress pli-progress"><div className="progress-fill" style={{ width: `${p.progression}%` }}/></div>
                  </div>
                  <span className="pli-pct">{p.progression}%</span>
                </div>
              ))}
              {mockProjects.filter(p => p.equipeId === showDetail._id).length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Aucun projet</p>}
            </div>
          </div>
        </Modal>
      )}

      {/* NEW TEAM MODAL */}
      {showNew && (
        <Modal title={t('teams.newTeam')} onClose={() => { setShowNew(false); resetForm(); }}
          footer={<><button className="btn btn-secondary" onClick={() => { setShowNew(false); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? t('teams.creating') : t('teams.createTeam')}</button></>}>
          <TeamForm form={form} setForm={setForm} formErr={formErr} t={t} users={mockUsers} toggleMember={toggleMember}/>
        </Modal>
      )}

      {/* EDIT TEAM MODAL */}
      {showEdit && (
        <Modal title={t('teams.editTeam')} onClose={() => { setShowEdit(null); resetForm(); }}
          footer={<><button className="btn btn-secondary" onClick={() => { setShowEdit(null); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? t('teams.creating') : t('common.save')}</button></>}>
          <TeamForm form={form} setForm={setForm} formErr={formErr} t={t} users={mockUsers} toggleMember={toggleMember}/>
        </Modal>
      )}

      {/* DELETE */}
      {showDel && (
        <Modal title={t('common.confirmation')} onClose={() => setShowDel(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowDel(null)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={handleDelete}>{t('common.delete')}</button></>}>
          <p style={{ fontSize: '0.9rem' }}>{t('teams.confirmDelete')} <strong>"{showDel.nom}"</strong> ?</p>
        </Modal>
      )}
    </div>
  );
}

function TeamForm({ form, setForm, formErr, t, users, toggleMember }) {
  return (
    <div>
      <div className="form-group"><label className="form-label">{t('teams.teamName')} *</label><input className="form-input" required value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: Équipe Frontend"/></div>
      <div className="form-group"><label className="form-label">{t('teams.teamDesc')}</label><textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}/></div>
      <div className="form-group">
        <label className="form-label">{t('teams.members')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.membres.map(mid => {
            const u = users.find(x => x.id === mid);
            if (!u) return null;
            return (
              <div key={mid} className="member-pill">
                <div className="avatar" style={{ width: 18, height: 18, fontSize: '0.6rem' }}>{u.nom?.charAt(0)}</div>
                {u.nom}
                <button type="button" onClick={() => toggleMember(mid)}>×</button>
              </div>
            );
          })}
        </div>
        <select className="form-select" onChange={e => { if (e.target.value) { toggleMember(e.target.value); e.target.value = ''; } }}>
          <option value="">{t('teams.addMembers')}</option>
          {users.filter(u => !form.membres.includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.nom} ({u.email})</option>)}
        </select>
      </div>
      {formErr && <div className="form-error">{formErr}</div>}
    </div>
  );
}
