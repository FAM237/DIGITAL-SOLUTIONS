import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';

const DSLogo = () => (
  <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#0f766e"/>
    <path d="M7 9h7a7 7 0 010 14H7V9z" fill="white"/>
    <path d="M19 13h6M19 19h4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const DEMO_ACCOUNTS = [
  { email: 'admin@digitalsolutions.cm', motDePasse: 'admin123', nom: 'Admin Principal', role: 'admin', id: 'u1', dateInscription: '2024-01-10T00:00:00Z', poste: 'Directeur Technique', actif: true },
  { email: 'marie@digitalsolutions.cm', motDePasse: 'user123',  nom: 'Marie Kouam',    role: 'user',  id: 'u2', dateInscription: '2024-02-15T00:00:00Z', poste: 'Chef de Projet',    actif: true },
  { email: 'jean@digitalsolutions.cm',  motDePasse: 'user123',  nom: 'Jean Fotso',     role: 'user',  id: 'u3', dateInscription: '2024-03-01T00:00:00Z', poste: 'Développeur Frontend', actif: true },
  { email: 'sophie@digitalsolutions.cm',motDePasse: 'user123',  nom: 'Sophie Mbarga',  role: 'user',  id: 'u4', dateInscription: '2024-03-20T00:00:00Z', poste: 'Designer UI/UX',    actif: true },
];

export default function AuthPage() {
  const { login, lang, toggleLang, theme, toggleTheme, mockUsers, setMockUsers, uid, now } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();
  const [tab, setTab]       = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({ nom: '', email: '', motDePasse: '', poste: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    if (tab === 'login') {
      // Check demo accounts first
      const demo = DEMO_ACCOUNTS.find(a => a.email === form.email && a.motDePasse === form.motDePasse);
      if (demo) {
        const { motDePasse: _, ...userData } = demo;
        login(userData, 'demo_token_' + userData.id);
        navigate('/');
        setLoading(false);
        return;
      }
      // Check registered users
      const found = mockUsers.find(u => u.email === form.email && u.motDePasse === form.motDePasse);
      if (found) {
        const { motDePasse: _, ...userData } = found;
        login(userData, 'token_' + userData.id);
        navigate('/');
      } else {
        setError(lang === 'fr' ? 'Email ou mot de passe incorrect' : 'Invalid email or password');
      }
    } else {
      if (!form.nom.trim()) { setError(t('common.required')); setLoading(false); return; }
      const exists = [...DEMO_ACCOUNTS, ...mockUsers].find(u => u.email === form.email);
      if (exists) { setError(lang === 'fr' ? 'Email déjà utilisé' : 'Email already taken'); setLoading(false); return; }
      const newUser = { id: uid(), nom: form.nom, email: form.email, motDePasse: form.motDePasse, role: 'user', poste: form.poste || 'Membre', dateInscription: now(), actif: true, avatar: form.nom.charAt(0) };
      setMockUsers(prev => [...prev, newUser]);
      const { motDePasse: _, ...userData } = newUser;
      login(userData, 'token_' + newUser.id);
      navigate('/');
    }
    setLoading(false);
  };

  const quickLogin = (acc) => {
    const { motDePasse: _, ...userData } = acc;
    login(userData, 'demo_token_' + userData.id);
    navigate('/');
  };

  const features_fr = [
    { text: 'Tableaux de bord dynamiques' },
    { text: 'Kanban Board interactif' },
    { text: 'Gestion d\'équipes complète' },
    { text: 'Notifications en temps réel' },
    { text: 'Calendrier des échéances' },
    { text: 'Messagerie d\'équipe intégrée' },
    { text: 'Suivi du temps par tâche' },
    { text: 'Rapports et analyses avancés' },
    { text: 'Rôles Admin / Utilisateur' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <DSLogo/>
          <div>
            <div className="auth-brand-name">Digital<span>Solutions</span></div>
            <div className="auth-brand-sub">Project Manager</div>
          </div>
        </div>
        <div className="auth-tagline">{t('auth.welcome')}</div>

        <div className="auth-features">
          {features_fr.map((f, i) => (
            <div key={i} className="auth-feature">
              <span className="auth-feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <div className="auth-demo-section">
          <div className="auth-demo-title">{lang === 'fr' ? 'Accès rapide démo' : 'Quick demo access'}</div>
          <div className="auth-demo-btns">
            <button className="demo-btn demo-btn-admin" onClick={() => quickLogin(DEMO_ACCOUNTS[0])}>
              <div><div className="demo-btn-role">Admin</div><div className="demo-btn-name">Admin Principal</div></div>
            </button>
            <button className="demo-btn demo-btn-user" onClick={() => quickLogin(DEMO_ACCOUNTS[1])}>
              <div><div className="demo-btn-role">User</div><div className="demo-btn-name">Marie Kouam</div></div>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="ctrl-btn auth-ctrl-btn" onClick={toggleTheme}>
            {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button className="ctrl-btn auth-ctrl-btn" onClick={toggleLang}>
             {lang === 'fr' ? 'English' : 'Français'}
          </button>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2 className="auth-box-title">{tab === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h2>
          <p className="auth-box-sub">
            {tab === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}{' '}
            <button className="auth-switch-btn" onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); }}>
              {tab === 'login' ? t('auth.register') : t('auth.login')}
            </button>
          </p>

          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>{t('auth.login')}</button>
            <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>{t('auth.register')}</button>
          </div>

          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">{t('auth.name')} *</label>
                  <input className="form-input" type="text" required placeholder="Jean Dupont"
                    value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('profile.poste')}</label>
                  <input className="form-input" type="text" placeholder="Ex: Développeur, Designer..."
                    value={form.poste} onChange={e => setForm(p => ({...p, poste: e.target.value}))}/>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">{t('auth.email')} *</label>
              <input className="form-input" type="email" required placeholder="vous@email.com"
                value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.password')} *</label>
              <input className="form-input" type="password" required placeholder="••••••••" minLength={6}
                value={form.motDePasse} onChange={e => setForm(p => ({...p, motDePasse: e.target.value}))}/>
              <div className="form-hint">{t('auth.minPassword')}</div>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px' }} disabled={loading}>
              {loading
                ? (tab === 'login' ? t('auth.loginLoading') : t('auth.registerLoading'))
                : (tab === 'login' ? t('auth.loginBtn') : t('auth.registerBtn'))}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
