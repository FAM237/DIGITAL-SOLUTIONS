import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'; }

const POSTES = ['Développeur Frontend','Développeur Backend','Designer UI/UX','Chef de Projet','DevOps','QA Engineer','Product Manager','Directeur Technique','Stagiaire','Autre'];

export default function ProfilePage() {
  const { user, token, login, lang, addToast, mockTasks, mockProjects, mockTeams, mockUsers, setMockUsers, mockActivity } = useApp();
  const t = useT(lang);

  const [form, setForm]   = useState({ nom: user?.nom || '', motDePasse: '', poste: user?.poste || '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab]     = useState('profile');
  const [err, setErr]     = useState('');

  const myTasks = mockTasks.filter(tk => tk.assigneA === user?.id);
  const doneTasks = myTasks.filter(t => t.statut === 'termine').length;
  const totalHours = myTasks.reduce((s, t) => s + (t.tempsLoggue || 0), 0);
  const myTeams = mockTeams.filter(tm => tm.membres?.includes(user?.id));
  const myProjects = mockProjects.filter(p => p.equipeId && myTeams.some(tm => tm._id === p.equipeId));
  const myActivity = mockActivity.filter(a => a.userId === user?.id).slice(0, 10);

  async function handleSave(e) {
    e.preventDefault(); setErr('');
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const updatedUser = { ...user, nom: form.nom, poste: form.poste };
    login(updatedUser, token);
    setMockUsers(prev => prev.map(u => u.id === user?.id ? { ...u, nom: form.nom, poste: form.poste, ...(form.motDePasse ? { motDePasse: form.motDePasse } : {}) } : u));
    setForm(p => ({ ...p, motDePasse: '' }));
    addToast(t('profile.updated'), 'success');
    setSaving(false);
  }

  const completionRate = myTasks.length > 0 ? Math.round((doneTasks / myTasks.length) * 100) : 0;
  const radarData = [
    { subject: 'Productivité', value: Math.min(100, completionRate) },
    { subject: 'Projets', value: Math.min(100, myProjects.length * 20) },
    { subject: 'Heures', value: Math.min(100, totalHours * 2) },
    { subject: 'Équipes', value: Math.min(100, myTeams.length * 33) },
    { subject: 'Activité', value: Math.min(100, myActivity.length * 10) },
  ];

  const timeAgo = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 60000);
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff/60)}h`;
    return `${Math.floor(diff/1440)}j`;
  };
  const actTypeIcon = { task: 'Task', project: 'Project', comment: 'Comment', time: 'Time', user: 'User' };

  return (
    <div>
      <div className="page-header"><h1 className="page-title">{t('profile.title')}</h1></div>

      {/* Profile Hero */}
      <div className="profile-hero card">
        <div className="profile-hero-left">
          <div className={`avatar avatar-xl ${user?.role === 'admin' ? 'avatar-admin' : ''}`} style={{ background: user?.role === 'admin' ? '#F59E0B' : 'var(--primary)', fontSize: '1.6rem' }}>
            {user?.nom?.charAt(0)}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{user?.nom}</h2>
            <p style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span className={`role-badge role-${user?.role}`}>{user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</span>
              {user?.poste && <span className="prio-tag" style={{ color: 'var(--info)', background: 'var(--info-l)' }}>{user.poste}</span>}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 8 }}>{t('profile.memberSince')} {fmtDate(user?.dateInscription)}</p>
          </div>
        </div>
        <div className="profile-hero-stats">
          {[
            { v: myTasks.length,    l: lang === 'fr' ? 'Tâches' : 'Tasks',        c: 'var(--primary)' },
            { v: doneTasks,         l: t('profile.tasksCompleted'),                c: 'var(--success)' },
            { v: myProjects.length, l: t('profile.projectsInvolved'),              c: 'var(--info)' },
            { v: `${totalHours}h`,  l: t('profile.hoursLogged'),                  c: '#8B5CF6' },
          ].map((s, i) => (
            <div key={i} className="profile-stat">
              <div className="profile-stat-value" style={{ color: s.c }}>{s.v}</div>
              <div className="profile-stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar">
        {[
          { key: 'profile',  label: lang === 'fr' ? 'Modifier' : 'Edit' },
          { key: 'stats',    label: t('profile.stats') },
          { key: 'activity', label: lang === 'fr' ? 'Activité' : 'Activity' },
        ].map(tb => <button key={tb.key} className={`tab-btn${tab === tb.key ? ' active' : ''}`} onClick={() => setTab(tb.key)}>{tb.label}</button>)}
      </div>

      {/* Edit Tab */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 520 }}>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 16px' }}>{t('profile.editProfile')}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">{t('profile.nameLabel')}</label>
                <input className="form-input" value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">{t('profile.poste')}</label>
                <select className="form-select" value={form.poste} onChange={e => setForm(p => ({...p, poste: e.target.value}))}>
                  <option value="">-- {lang === 'fr' ? 'Sélectionner' : 'Select'} --</option>
                  {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('profile.newPassword')}</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.motDePasse} onChange={e => setForm(p => ({...p, motDePasse: e.target.value}))}/>
                <div className="form-hint">{t('profile.leaveEmpty')}</div>
              </div>
              {err && <div className="form-error" style={{ marginBottom: 10 }}>{err}</div>}
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('common.loading') : t('profile.save')}</button>
            </form>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">{lang === 'fr' ? 'Tâches par statut' : 'Tasks by status'}</span></div>
            <div className="stats-info-list">
              {[
                { l: 'À faire', v: myTasks.filter(t => t.statut === 'a_faire').length, c: '#F59E0B' },
                { l: 'En cours', v: myTasks.filter(t => t.statut === 'en_cours').length, c: '#3B82F6' },
                { l: 'Terminées', v: doneTasks, c: '#10B981' },
                { l: lang === 'fr' ? 'Taux de complétion' : 'Completion rate', v: `${completionRate}%`, c: completionRate >= 70 ? '#10B981' : completionRate >= 40 ? '#F59E0B' : '#EF4444' },
              ].map((s, i) => (
                <div key={i} className="sys-stat-row">
                  <span>{s.l}</span>
                  <strong style={{ color: s.c }}>{s.v}</strong>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${completionRate}%`, background: '#10B981', borderRadius: 999, transition: 'width .4s' }}/>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{lang === 'fr' ? 'Temps & Équipes' : 'Time & Teams'}</span></div>
            <div className="stats-info-list">
              {[
                { l: lang === 'fr' ? 'Heures estimées' : 'Estimated hours', v: `${myTasks.reduce((s, t) => s + (t.tempsEstime || 0), 0)}h` },
                { l: lang === 'fr' ? 'Heures loggées' : 'Logged hours', v: `${totalHours}h`, c: 'var(--primary)' },
                { l: lang === 'fr' ? 'Mes équipes' : 'My teams', v: myTeams.length },
                { l: lang === 'fr' ? 'Mes projets' : 'My projects', v: myProjects.length },
                { l: lang === 'fr' ? 'Commentaires rédigés' : 'Comments written', v: myTasks.reduce((s, t) => s + (t.commentaires?.filter(c => c.auteurId === user?.id).length || 0), 0) },
              ].map((s, i) => (
                <div key={i} className="sys-stat-row">
                  <span>{s.l}</span>
                  <strong style={{ color: s.c || 'var(--text)' }}>{s.v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {tab === 'activity' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 14 }}>{lang === 'fr' ? 'Mon activité récente' : 'My recent activity'}</h3>
          {myActivity.length === 0 ? <p style={{ fontSize: '0.83rem', color: 'var(--text3)' }}>{lang === 'fr' ? 'Aucune activité enregistrée' : 'No activity recorded'}</p> : (
            <div className="activity-log">
              {myActivity.map(item => (
                <div key={item.id} className="activity-log-item">
                  <div className="alg-icon">{actTypeIcon[item.type] || ''}</div>
                  <div className="alg-body" style={{ flex: 1 }}>
                    <span className="alg-action">{item.action} </span>
                    <span className="alg-target">"{item.cible}"</span>
                  </div>
                  <div className="alg-time">{timeAgo(item.date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
