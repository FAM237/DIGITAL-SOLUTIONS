import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import Modal from '../components/Modal';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; }

const ROLES = ['user', 'admin'];
const POSTES = ['Développeur Frontend', 'Développeur Backend', 'Designer UI/UX', 'Chef de Projet', 'DevOps', 'QA Engineer', 'Product Manager', 'Directeur Technique', 'Stagiaire', 'Autre'];

export default function AdminPage() {
  const { lang, mockUsers, setMockUsers, mockProjects, mockTasks, mockTeams, mockActivity, addToast, uid, now, logActivity, user: currentUser } = useApp();
  const t = useT(lang);

  const [tab, setTab]         = useState('users');
  const [search, setSearch]   = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDel, setShowDel] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState('');
  const [form, setForm]       = useState({ nom: '', email: '', motDePasse: '', role: 'user', poste: '', actif: true });

  const filtered = mockUsers.filter(u =>
    u.nom?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.poste?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const activeProjects  = mockProjects.filter(p => p.statut === 'actif').length;
  const archivedProjects = mockProjects.filter(p => p.statut === 'archive').length;
  const totalTasks   = mockTasks.length;
  const doneTasks    = mockTasks.filter(t => t.statut === 'termine').length;
  const inProgressT  = mockTasks.filter(t => t.statut === 'en_cours').length;
  const overdueTasks = mockTasks.filter(t => t.statut !== 'termine' && t.dateEcheance && new Date(t.dateEcheance) < new Date()).length;
  const totalHours   = mockTasks.reduce((s, t) => s + (t.tempsLoggue || 0), 0);
  const activeUsers  = mockUsers.filter(u => u.actif).length;
  const adminUsers   = mockUsers.filter(u => u.role === 'admin').length;

  // Per-user stats
  const userStats = mockUsers.map(u => ({
    ...u,
    tasksCount: mockTasks.filter(t => t.assigneA === u.id).length,
    tasksDone:  mockTasks.filter(t => t.assigneA === u.id && t.statut === 'termine').length,
    hoursLogged: mockTasks.filter(t => t.assigneA === u.id).reduce((s, t) => s + (t.tempsLoggue || 0), 0),
  }));

  function resetForm() { setForm({ nom: '', email: '', motDePasse: '', role: 'user', poste: '', actif: true }); setFormErr(''); }

  async function handleCreate(e) {
    e.preventDefault(); setFormErr('');
    if (!form.nom.trim() || !form.email.trim() || !form.motDePasse.trim()) { setFormErr(t('common.required')); return; }
    if (mockUsers.find(u => u.email === form.email)) { setFormErr(lang === 'fr' ? 'Email déjà utilisé' : 'Email already used'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const newUser = { id: uid(), nom: form.nom, email: form.email, motDePasse: form.motDePasse, role: form.role, poste: form.poste, actif: form.actif, dateInscription: now(), avatar: form.nom.charAt(0) };
    setMockUsers(prev => [...prev, newUser]);
    logActivity('a créé l\'utilisateur', form.nom, 'user');
    addToast(t('admin.userCreated'), 'success');
    setShowNew(false); resetForm(); setSaving(false);
  }

  async function handleEdit(e) {
    e.preventDefault(); setFormErr('');
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    setMockUsers(prev => prev.map(u => u.id === showEdit.id ? { ...u, nom: form.nom, email: form.email, role: form.role, poste: form.poste, actif: form.actif, ...(form.motDePasse ? { motDePasse: form.motDePasse } : {}) } : u));
    logActivity('a modifié l\'utilisateur', form.nom, 'user');
    addToast(t('admin.userUpdated'), 'success');
    setShowEdit(null); resetForm(); setSaving(false);
  }

  async function handleDelete() {
    if (showDel.id === currentUser?.id) { addToast(lang === 'fr' ? 'Impossible de se supprimer soi-même' : 'Cannot delete yourself', 'error'); setShowDel(null); return; }
    setMockUsers(prev => prev.filter(u => u.id !== showDel.id));
    logActivity('a supprimé l\'utilisateur', showDel.nom, 'user');
    addToast(t('admin.userDeleted'), 'success');
    setShowDel(null);
  }

  const toggleActive = (uid) => {
    setMockUsers(prev => prev.map(u => u.id === uid ? { ...u, actif: !u.actif } : u));
    addToast(lang === 'fr' ? 'Statut mis à jour' : 'Status updated', 'success');
  };

  const openEdit = (u) => {
    setForm({ nom: u.nom, email: u.email, motDePasse: '', role: u.role, poste: u.poste || '', actif: u.actif !== false });
    setShowEdit(u); setFormErr('');
  };

  const timeAgo = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 60000);
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff/60)}h`;
    return `${Math.floor(diff/1440)}j`;
  };

  const actTypeIcon = { task: 'Task', project: 'Project', comment: 'Comment', time: 'Time', user: 'User' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('admin.title')}</h1>
          <p className="page-subtitle">{lang === 'fr' ? 'Gestion globale de la plateforme' : 'Global platform management'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowNew(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            {t('admin.addUser')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        {[
          { v: mockUsers.length,   l: lang === 'fr' ? 'Utilisateurs totaux' : 'Total users',    c: 'var(--primary)', bg: 'var(--primary-l)' },
          { v: activeUsers,        l: lang === 'fr' ? 'Actifs' : 'Active',                      c: 'var(--success)', bg: 'var(--success-l)' },
          { v: adminUsers,         l: lang === 'fr' ? 'Admins' : 'Admins',                      c: '#F59E0B', bg: '#FEF3C7' },
          { v: activeProjects,     l: lang === 'fr' ? 'Projets actifs' : 'Active projects',     c: 'var(--info)', bg: 'var(--info-l)' },
          { v: totalTasks,         l: lang === 'fr' ? 'Tâches totales' : 'Total tasks',         c: '#8B5CF6', bg: '#EDE9FE' },
          { v: `${totalHours}h`,   l: lang === 'fr' ? 'Heures loggées' : 'Hours logged',        c: '#EC4899', bg: '#FCE7F3' },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card">
            <div className="admin-stat-value" style={{ color: s.c }}>{s.v}</div>
            <div className="admin-stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {[
          { key: 'users',    label: lang === 'fr' ? 'Utilisateurs' : 'Users' },
          { key: 'stats',    label: lang === 'fr' ? 'Performances' : 'Performance' },
          { key: 'activity', label: lang === 'fr' ? 'Activité' : 'Activity' },
          { key: 'system',   label: lang === 'fr' ? 'Système' : 'System' },
        ].map(tb => (
          <button key={tb.key} className={`tab-btn${tab === tb.key ? ' active' : ''}`} onClick={() => setTab(tb.key)}>{tb.label}</button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          <div className="search-bar" style={{ marginBottom: 16 }}>
            <div className="search-input">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="form-input" placeholder={lang === 'fr' ? 'Rechercher un utilisateur...' : 'Search users...'} value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{lang === 'fr' ? 'Utilisateur' : 'User'}</th>
                  <th>Email</th>
                  <th>{t('profile.poste')}</th>
                  <th>{t('admin.role')}</th>
                  <th>{t('admin.status')}</th>
                  <th>{lang === 'fr' ? 'Inscription' : 'Joined'}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={`avatar avatar-sm ${u.role === 'admin' ? 'avatar-admin' : ''}`} style={{ background: u.role === 'admin' ? '#F59E0B' : 'var(--primary)' }}>{u.nom?.charAt(0)}</div>
                        <span style={{ fontWeight: 500 }}>{u.nom}</span>
                        {u.id === currentUser?.id && <span className="badge-you">moi</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>{u.email}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{u.poste || '-'}</td>
                    <td>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <button className={`status-toggle ${u.actif !== false ? 'active' : 'inactive'}`} onClick={() => toggleActive(u.id)} title={lang === 'fr' ? 'Basculer statut' : 'Toggle status'}>
                        <span className="status-toggle-dot"/>
                        {u.actif !== false ? t('admin.active') : t('admin.inactive')}
                      </button>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{fmtDate(u.dateInscription)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title={t('common.edit')}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setShowDel(u)} title={t('common.delete')} disabled={u.id === currentUser?.id}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {tab === 'stats' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>{lang === 'fr' ? 'Performance par utilisateur' : 'Performance per user'}</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang === 'fr' ? 'Utilisateur' : 'User'}</th>
                <th>{lang === 'fr' ? 'Tâches assignées' : 'Assigned tasks'}</th>
                <th>{lang === 'fr' ? 'Terminées' : 'Done'}</th>
                <th>{lang === 'fr' ? 'Taux' : 'Rate'}</th>
                <th>{lang === 'fr' ? 'Heures loggées' : 'Hours logged'}</th>
              </tr>
            </thead>
            <tbody>
              {userStats.sort((a, b) => b.tasksDone - a.tasksDone).map(u => {
                const rate = u.tasksCount > 0 ? Math.round((u.tasksDone / u.tasksCount) * 100) : 0;
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar avatar-sm">{u.nom?.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.nom}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{u.poste || u.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.tasksCount}</td>
                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{u.tasksDone}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 999 }}>
                          <div style={{ height: '100%', width: `${rate}%`, background: rate >= 70 ? 'var(--success)' : rate >= 40 ? 'var(--warning)' : 'var(--danger)', borderRadius: 999 }}/>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: 32 }}>{rate}%</span>
                      </div>
                    </td>
                    <td><span style={{ color: 'var(--info)', fontWeight: 600 }}>{u.hoursLogged}h</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Tab */}
      {tab === 'activity' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>{lang === 'fr' ? 'Journal d\'activité' : 'Activity log'}</h3>
          <div className="activity-log">
            {mockActivity.slice(0, 20).map(item => {
              const u = mockUsers.find(x => x.id === item.userId);
              return (
                <div key={item.id} className="activity-log-item">
                  <div className="alg-icon">{actTypeIcon[item.type] || 'Item'}</div>
                  <div className="alg-body">
                    <div className="alg-avatar">{u?.nom?.charAt(0) || '?'}</div>
                    <div>
                      <span className="alg-user">{u?.nom || 'Système'}</span>
                      <span className="alg-action"> {item.action} </span>
                      <span className="alg-target">"{item.cible}"</span>
                    </div>
                  </div>
                  <div className="alg-time">{timeAgo(item.date)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* System Tab */}
      {tab === 'system' && (
        <div className="system-grid">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>{lang === 'fr' ? 'Statistiques système' : 'System statistics'}</h3>
            <div className="sys-stats-list">
              {[
                { l: lang === 'fr' ? 'Projets actifs' : 'Active projects', v: activeProjects, c: 'var(--primary)' },
                { l: lang === 'fr' ? 'Projets archivés' : 'Archived projects', v: archivedProjects, c: 'var(--text3)' },
                { l: lang === 'fr' ? 'Tâches à faire' : 'Pending tasks', v: totalTasks - doneTasks - inProgressT, c: 'var(--warning)' },
                { l: lang === 'fr' ? 'Tâches en cours' : 'In progress', v: inProgressT, c: 'var(--info)' },
                { l: lang === 'fr' ? 'Tâches terminées' : 'Done tasks', v: doneTasks, c: 'var(--success)' },
                { l: lang === 'fr' ? 'Tâches en retard' : 'Overdue tasks', v: overdueTasks, c: 'var(--danger)' },
                { l: lang === 'fr' ? 'Équipes' : 'Teams', v: mockTeams.length, c: '#8B5CF6' },
                { l: lang === 'fr' ? 'Total heures' : 'Total hours', v: `${totalHours}h`, c: '#EC4899' },
              ].map((s, i) => (
                <div key={i} className="sys-stat-row">
                  <span style={{ color: 'var(--text2)' }}>{s.l}</span>
                  <strong style={{ color: s.c }}>{s.v}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>{lang === 'fr' ? 'Configuration' : 'Configuration'}</h3>
            <div className="config-info">
              <div className="config-row"><span>Version</span><span className="config-val">1.0.0</span></div>
              <div className="config-row"><span>{lang === 'fr' ? 'Environnement' : 'Environment'}</span><span className="config-val config-demo">Demo Mode</span></div>
              <div className="config-row"><span>{lang === 'fr' ? 'Langue système' : 'System lang'}</span><span className="config-val">{lang.toUpperCase()}</span></div>
              <div className="config-row"><span>{lang === 'fr' ? 'Stockage' : 'Storage'}</span><span className="config-val">LocalStorage</span></div>
              <div className="config-row"><span>{lang === 'fr' ? 'Connecté en tant que' : 'Logged as'}</span><span className="config-val config-admin">Admin</span></div>
            </div>
            <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg3)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text3)' }}>
              {lang === 'fr' ? 'Toutes les données sont stockées localement pour la démo. Connectez un backend pour la production.' : 'All data is stored locally for demo purposes. Connect a backend for production.'}
            </div>
          </div>
        </div>
      )}

      {/* NEW USER MODAL */}
      {showNew && (
        <Modal title={t('admin.addUser')} onClose={() => { setShowNew(false); resetForm(); }}
          footer={<><button className="btn btn-secondary" onClick={() => { setShowNew(false); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? t('common.loading') : t('common.add')}</button></>}>
          <UserForm form={form} setForm={setForm} formErr={formErr} t={t} lang={lang} showPassword/>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {showEdit && (
        <Modal title={t('admin.editUser')} onClose={() => { setShowEdit(null); resetForm(); }}
          footer={<><button className="btn btn-secondary" onClick={() => { setShowEdit(null); resetForm(); }}>{t('common.cancel')}</button><button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button></>}>
          <UserForm form={form} setForm={setForm} formErr={formErr} t={t} lang={lang} showPassword={false}/>
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      {showDel && (
        <Modal title={t('common.confirmation')} onClose={() => setShowDel(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowDel(null)}>{t('common.cancel')}</button><button className="btn btn-danger" onClick={handleDelete}>{t('common.delete')}</button></>}>
          <p style={{ fontSize: '0.9rem' }}>{t('admin.confirmDelete')} <strong>"{showDel.nom}"</strong> ?</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 8 }}>{lang === 'fr' ? 'Cette action est irréversible.' : 'This action is irreversible.'}</p>
        </Modal>
      )}
    </div>
  );
}

function UserForm({ form, setForm, formErr, t, lang, showPassword }) {
  return (
    <div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">{lang === 'fr' ? 'Nom complet' : 'Full name'} *</label>
          <input className="form-input" required value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Jean Dupont"/>
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="form-input" type="email" required value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="jean@example.com"/>
        </div>
      </div>
      {showPassword && (
        <div className="form-group">
          <label className="form-label">{lang === 'fr' ? 'Mot de passe' : 'Password'} *</label>
          <input className="form-input" type="password" required minLength={6} value={form.motDePasse} onChange={e => setForm(p => ({...p, motDePasse: e.target.value}))} placeholder="••••••••"/>
        </div>
      )}
      {!showPassword && (
        <div className="form-group">
          <label className="form-label">{lang === 'fr' ? 'Nouveau mot de passe (optionnel)' : 'New password (optional)'}</label>
          <input className="form-input" type="password" value={form.motDePasse} onChange={e => setForm(p => ({...p, motDePasse: e.target.value}))} placeholder="••••••••"/>
        </div>
      )}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">{t('profile.poste')}</label>
          <select className="form-select" value={form.poste} onChange={e => setForm(p => ({...p, poste: e.target.value}))}>
            <option value="">-- {lang === 'fr' ? 'Sélectionner' : 'Select'} --</option>
            {['Développeur Frontend','Développeur Backend','Designer UI/UX','Chef de Projet','DevOps','QA Engineer','Product Manager','Directeur Technique','Stagiaire','Autre'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('admin.role')}</label>
          <select className="form-select" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('admin.status')}</label>
        <div className="toggle-row">
          <span style={{ fontSize: '0.85rem' }}>{form.actif ? t('admin.active') : t('admin.inactive')}</span>
          <button type="button" className={`toggle-switch ${form.actif ? 'on' : ''}`} onClick={() => setForm(p => ({...p, actif: !p.actif}))}>
            <span className="toggle-knob"/>
          </button>
        </div>
      </div>
      {formErr && <div className="form-error">{formErr}</div>}
    </div>
  );
}
