import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useT } from '../i18n/translations';
import ToastContainer from './Toast';

export const Icon = ({ d, size = 18, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p}/>) : <path d={d}/>}
  </svg>
);

const ICONS = {
  dashboard:  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  projects:   'M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7l1 12a2 2 0 002 2h12a2 2 0 002-2l1-12',
  myTasks:    'M9 11l3 3 8-8M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7M5 12V7a2 2 0 012-2h2M15 5h2a2 2 0 012 2v5',
  teams:      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  messages:   'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  calendar:   'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  notifs:     'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  profile:    'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8',
  admin:      'M12 1l3 6 6 .75-4.5 4.25L17.73 18 12 15 6.27 18l1.23-5.5-4.5-4.75L9 6z',
  reports:    'M18 20V10M12 20V4M6 20v-6',
  logout:     'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  moon:       'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  sun:        'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  lang:       'M5 8h14M5 12h14M5 16h14',
  logo:       'M4 6h16M4 12h16M4 18h16',
  shield:     'M12 2l7 4v6c0 5.25-3.5 10-7 12-3.5-2-7-6.75-7-12V6l7-4z',
};

const DSLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="#0f766e"/>
    <path d="M7 9h7a7 7 0 010 14H7V9z" fill="white"/>
    <path d="M19 13h6M19 19h4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export default function Layout({ children }) {
  const { user, theme, lang, isAdmin, toggleTheme, toggleLang, logout, notifCount } = useApp();
  const t = useT(lang);
  const navigate = useNavigate();

  const userNavItems = [
    { to: '/',              label: t('nav.dashboard'),     icon: ICONS.dashboard },
    { to: '/projects',      label: t('nav.projects'),      icon: ICONS.projects  },
    { to: '/my-tasks',      label: t('nav.myTasks'),       icon: ICONS.myTasks   },
    { to: '/teams',         label: t('nav.teams'),         icon: ICONS.teams     },
    { to: '/messages',      label: t('nav.messages'),      icon: ICONS.messages  },
    { to: '/calendar',      label: t('nav.calendar'),      icon: ICONS.calendar  },
    { to: '/notifications', label: t('nav.notifications'), icon: ICONS.notifs, badge: notifCount },
  ];

  const adminNavItems = [
    { to: '/',              label: t('nav.dashboard'),     icon: ICONS.dashboard },
    { to: '/projects',      label: t('nav.projects'),      icon: ICONS.projects  },
    { to: '/teams',         label: t('nav.teams'),         icon: ICONS.teams     },
    { to: '/messages',      label: t('nav.messages'),      icon: ICONS.messages  },
    { to: '/calendar',      label: t('nav.calendar'),      icon: ICONS.calendar  },
    { to: '/notifications', label: t('nav.notifications'), icon: ICONS.notifs, badge: notifCount },
  ];

  const adminOnlyItems = [
    { to: '/admin',   label: t('nav.admin'),   icon: ICONS.admin   },
    { to: '/reports', label: t('nav.reports'), icon: ICONS.reports },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <DSLogo/>
          <div>
            <div className="sidebar-brand-name">Digital<span>Solutions</span></div>
            <div className="sidebar-brand-sub">Project Manager</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">{lang === 'fr' ? 'Navigation' : 'Navigation'}</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon d={item.icon} size={16}/>
              <span>{item.label}</span>
              {item.badge > 0 && <span className="nav-badge">{item.badge > 9 ? '9+' : item.badge}</span>}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: 12 }}>{lang === 'fr' ? 'Administration' : 'Administration'}</div>
              {adminOnlyItems.map(item => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item nav-item-admin${isActive ? ' active' : ''}`}>
                  <Icon d={item.icon} size={16}/>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}

          <div className="nav-section" style={{ marginTop: 12 }}>{lang === 'fr' ? 'Compte' : 'Account'}</div>
          <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon d={ICONS.profile} size={16}/>
            <span>{t('nav.profile')}</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-controls">
            <button className="ctrl-btn" onClick={toggleTheme}>
              <Icon d={theme === 'dark' ? ICONS.sun : ICONS.moon} size={14}/>
              <span>{theme === 'dark' ? (lang === 'fr' ? 'Mode clair' : 'Light mode') : (lang === 'fr' ? 'Mode sombre' : 'Dark mode')}</span>
              <div className={`ctrl-toggle ${theme === 'dark' ? 'on' : ''}`}/>
            </button>
            <button className="ctrl-btn" onClick={toggleLang}>
              <Icon d={ICONS.lang} size={14}/>
              <span>{lang === 'fr' ? 'English' : 'Français'}</span>
              <span className="ctrl-lang-badge">{lang.toUpperCase()}</span>
            </button>
            <hr className="sidebar-divider"/>
            {user && (
              <div className="sidebar-user">
                <div className={`avatar sidebar-avatar ${isAdmin ? 'avatar-admin' : ''}`}>{user.nom?.charAt(0)}</div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{user.nom}</div>
                  <div className={`sidebar-user-role ${isAdmin ? 'role-admin' : 'role-user'}`}>
                    {isAdmin && <Icon d={ICONS.shield} size={10}/>}
                    {user.role === 'admin' ? (lang === 'fr' ? 'Administrateur' : 'Administrator') : (lang === 'fr' ? 'Utilisateur' : 'User')}
                  </div>
                </div>
              </div>
            )}
            <button className="ctrl-btn ctrl-btn-logout" onClick={() => { logout(); navigate('/auth'); }}>
              <Icon d={ICONS.logout} size={14}/>
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-content">
          {children}
        </div>
      </main>

      <ToastContainer/>
    </div>
  );
}
