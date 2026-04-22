import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

// ── Mock data helpers ────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 10); }
function now() { return new Date().toISOString(); }

const MOCK_USERS = [
  { id: 'u1', nom: 'Admin Principal', email: 'admin@digitalsolutions.cm', role: 'admin', dateInscription: '2024-01-10T00:00:00Z', actif: true, avatar: 'A', poste: 'Directeur Technique' },
  { id: 'u2', nom: 'Marie Kouam', email: 'marie@digitalsolutions.cm', role: 'user', dateInscription: '2024-02-15T00:00:00Z', actif: true, avatar: 'M', poste: 'Chef de Projet' },
  { id: 'u3', nom: 'Jean Fotso', email: 'jean@digitalsolutions.cm', role: 'user', dateInscription: '2024-03-01T00:00:00Z', actif: true, avatar: 'J', poste: 'Développeur Frontend' },
  { id: 'u4', nom: 'Sophie Mbarga', email: 'sophie@digitalsolutions.cm', role: 'user', dateInscription: '2024-03-20T00:00:00Z', actif: true, avatar: 'S', poste: 'Designer UI/UX' },
  { id: 'u5', nom: 'Paul Nkomo', email: 'paul@digitalsolutions.cm', role: 'user', dateInscription: '2024-04-05T00:00:00Z', actif: false, avatar: 'P', poste: 'Développeur Backend' },
];

const MOCK_TEAMS = [
  { _id: 't1', nom: 'Équipe Frontend', description: 'Développement des interfaces utilisateur', membres: ['u2','u3','u4'], membresInfo: MOCK_USERS.filter(u => ['u2','u3','u4'].includes(u.id)), dateCreation: '2024-01-15T00:00:00Z' },
  { _id: 't2', nom: 'Équipe Backend', description: 'Développement des APIs et bases de données', membres: ['u1','u5'], membresInfo: MOCK_USERS.filter(u => ['u1','u5'].includes(u.id)), dateCreation: '2024-01-20T00:00:00Z' },
  { _id: 't3', nom: 'Équipe Design', description: 'Conception graphique et expérience utilisateur', membres: ['u4','u2'], membresInfo: MOCK_USERS.filter(u => ['u4','u2'].includes(u.id)), dateCreation: '2024-02-01T00:00:00Z' },
];

const MOCK_PROJECTS = [
  { _id: 'p1', titre: 'Refonte Site Web', description: 'Modernisation complète du site corporate avec nouveau design et CMS', statut: 'actif', priorite: 'haute', equipeId: 't1', dateCreation: '2024-02-01T00:00:00Z', dateEcheance: '2024-07-30T00:00:00Z', progression: 65, budget: 5000000, couleur: '#0f766e' },
  { _id: 'p2', titre: 'Application Mobile', description: 'Développement d\'une app mobile cross-platform pour les clients', statut: 'actif', priorite: 'critique', equipeId: 't2', dateCreation: '2024-03-01T00:00:00Z', dateEcheance: '2024-09-15T00:00:00Z', progression: 30, budget: 8000000, couleur: '#7c3aed' },
  { _id: 'p3', titre: 'Dashboard Analytics', description: 'Tableau de bord analytique temps réel pour la direction', statut: 'actif', priorite: 'moyenne', equipeId: 't1', dateCreation: '2024-04-01T00:00:00Z', dateEcheance: '2024-08-01T00:00:00Z', progression: 80, budget: 3000000, couleur: '#2563eb' },
  { _id: 'p4', titre: 'Système ERP', description: 'Intégration d\'un ERP complet pour la gestion interne', statut: 'archive', priorite: 'haute', equipeId: 't2', dateCreation: '2023-10-01T00:00:00Z', dateEcheance: '2024-04-01T00:00:00Z', progression: 100, budget: 12000000, couleur: '#d97706' },
  { _id: 'p5', titre: 'Formation Équipe', description: 'Programme de formation aux nouvelles technologies', statut: 'actif', priorite: 'basse', equipeId: 't3', dateCreation: '2024-05-01T00:00:00Z', dateEcheance: '2024-12-31T00:00:00Z', progression: 15, budget: 1500000, couleur: '#db2777' },
];

const MOCK_TASKS = [
  { _id: 'tk1', titre: 'Maquettes pages principales', description: 'Créer les maquettes Figma pour les 5 pages principales', projetId: 'p1', assigneA: 'u4', statut: 'termine', priorite: 'haute', dateEcheance: '2024-03-15T00:00:00Z', dateFin: '2024-03-14T00:00:00Z', tempsEstime: 16, tempsLoggue: 14, tags: ['design','figma'], commentaires: [{id:'c1', auteurId:'u2', texte:'Excellent travail, conforme aux attentes', date:'2024-03-14T10:00:00Z'}] },
  { _id: 'tk2', titre: 'Intégration HTML/CSS', description: 'Intégrer les maquettes en HTML/CSS responsive', projetId: 'p1', assigneA: 'u3', statut: 'en_cours', priorite: 'haute', dateEcheance: '2024-04-30T00:00:00Z', tempsEstime: 24, tempsLoggue: 18, tags: ['frontend','css'], commentaires: [] },
  { _id: 'tk3', titre: 'API REST authentification', description: 'Développer les endpoints d\'auth avec JWT', projetId: 'p2', assigneA: 'u5', statut: 'termine', priorite: 'critique', dateEcheance: '2024-04-01T00:00:00Z', tempsEstime: 20, tempsLoggue: 22, tags: ['backend','api'], commentaires: [{id:'c2', auteurId:'u1', texte:'Bien, mais ajouter rate limiting', date:'2024-04-01T09:00:00Z'}] },
  { _id: 'tk4', titre: 'Écran onboarding mobile', description: 'UI des écrans d\'introduction de l\'app mobile', projetId: 'p2', assigneA: 'u4', statut: 'a_faire', priorite: 'moyenne', dateEcheance: '2024-06-15T00:00:00Z', tempsEstime: 12, tempsLoggue: 0, tags: ['mobile','design'], commentaires: [] },
  { _id: 'tk5', titre: 'Graphiques temps réel', description: 'Implémenter recharts avec WebSocket', projetId: 'p3', assigneA: 'u3', statut: 'en_cours', priorite: 'haute', dateEcheance: '2024-06-01T00:00:00Z', tempsEstime: 30, tempsLoggue: 25, tags: ['frontend','charts'], commentaires: [] },
  { _id: 'tk6', titre: 'Tests unitaires API', description: 'Couverture de tests > 80% sur les controllers', projetId: 'p3', assigneA: 'u5', statut: 'a_faire', priorite: 'moyenne', dateEcheance: '2024-07-01T00:00:00Z', tempsEstime: 16, tempsLoggue: 0, tags: ['test','backend'], commentaires: [] },
  { _id: 'tk7', titre: 'Déploiement production', description: 'Configuration CI/CD et déploiement sur serveur', projetId: 'p1', assigneA: 'u1', statut: 'a_faire', priorite: 'haute', dateEcheance: '2024-07-25T00:00:00Z', tempsEstime: 8, tempsLoggue: 0, tags: ['devops'], commentaires: [] },
];

const MOCK_MESSAGES = [
  { _id: 'm1', equipeId: 't1', auteurId: 'u2', texte: 'Bonjour l\'équipe ! Rappel: réunion standup demain 9h', date: '2024-05-10T08:00:00Z', type: 'text' },
  { _id: 'm2', equipeId: 't1', auteurId: 'u3', texte: 'J\'ai poussé les nouvelles maquettes sur le repo, merci de reviewer', date: '2024-05-10T09:30:00Z', type: 'text' },
  { _id: 'm3', equipeId: 't1', auteurId: 'u4', texte: 'Super ! Je regarde ça dans l\'après-midi', date: '2024-05-10T09:45:00Z', type: 'text' },
  { _id: 'm4', equipeId: 't2', auteurId: 'u1', texte: 'Les APIs sont en prod. Voici le lien de doc: https://api.digitalsolutions.cm/docs', date: '2024-05-09T14:00:00Z', type: 'text' },
  { _id: 'm5', equipeId: 't2', auteurId: 'u5', texte: 'Performance optimisée, temps de réponse < 200ms maintenant ', date: '2024-05-09T15:00:00Z', type: 'text' },
];

const MOCK_NOTIFICATIONS = [
  { _id: 'n1', userId: 'u2', type: 'task_assigned', message: 'Vous avez été assigné à la tâche "Intégration HTML/CSS"', lu: false, date: '2024-05-10T10:00:00Z', lien: '/projects/p1' },
  { _id: 'n2', userId: 'u3', type: 'deadline', message: 'La tâche "Graphiques temps réel" arrive à échéance dans 3 jours', lu: false, date: '2024-05-09T08:00:00Z', lien: '/projects/p3' },
  { _id: 'n3', userId: 'u1', type: 'project_update', message: 'Le projet "Dashboard Analytics" est à 80% de progression', lu: true, date: '2024-05-08T16:00:00Z', lien: '/projects/p3' },
  { _id: 'n4', userId: 'u4', type: 'comment', message: 'Admin a commenté votre tâche "Maquettes pages principales"', lu: false, date: '2024-05-07T11:00:00Z', lien: '/projects/p1' },
  { _id: 'n5', userId: 'u2', type: 'task_done', message: 'La tâche "API REST authentification" a été marquée terminée', lu: true, date: '2024-05-06T17:00:00Z', lien: '/projects/p2' },
];

const MOCK_ACTIVITY = [
  { id: 'a1', userId: 'u3', action: 'a mis à jour', cible: 'Intégration HTML/CSS', type: 'task', date: '2024-05-10T14:30:00Z' },
  { id: 'a2', userId: 'u4', action: 'a créé', cible: 'Écran onboarding mobile', type: 'task', date: '2024-05-10T11:00:00Z' },
  { id: 'a3', userId: 'u2', action: 'a commenté', cible: 'Maquettes pages principales', type: 'comment', date: '2024-05-10T09:00:00Z' },
  { id: 'a4', userId: 'u1', action: 'a créé', cible: 'Formation Équipe', type: 'project', date: '2024-05-09T16:00:00Z' },
  { id: 'a5', userId: 'u5', action: 'a terminé', cible: 'API REST authentification', type: 'task', date: '2024-05-09T14:00:00Z' },
  { id: 'a6', userId: 'u3', action: 'a loggué 3h sur', cible: 'Graphiques temps réel', type: 'time', date: '2024-05-08T18:00:00Z' },
];

// ── Context ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [user, setUser]     = useState(() => { try { return JSON.parse(localStorage.getItem('ds_user')); } catch { return null; } });
  const [token, setToken]   = useState(() => localStorage.getItem('ds_token') || null);
  const [theme, setTheme]   = useState(() => localStorage.getItem('ds_theme') || 'light');
  const [lang, setLang]     = useState(() => localStorage.getItem('ds_lang') || 'fr');
  const [toasts, setToasts] = useState([]);
  const [notifCount, setNotifCount] = useState(0);

  // Mock data stored in state (simulates backend)
  const [mockUsers, setMockUsers]   = useState(() => { try { return JSON.parse(localStorage.getItem('ds_users')) || MOCK_USERS; } catch { return MOCK_USERS; } });
  const [mockProjects, setMockProjects] = useState(() => { try { return JSON.parse(localStorage.getItem('ds_projects')) || MOCK_PROJECTS; } catch { return MOCK_PROJECTS; } });
  const [mockTasks, setMockTasks]   = useState(() => { try { return JSON.parse(localStorage.getItem('ds_tasks')) || MOCK_TASKS; } catch { return MOCK_TASKS; } });
  const [mockTeams, setMockTeams]   = useState(() => { try { return JSON.parse(localStorage.getItem('ds_teams')) || MOCK_TEAMS; } catch { return MOCK_TEAMS; } });
  const [mockMessages, setMockMessages] = useState(() => { try { return JSON.parse(localStorage.getItem('ds_messages')) || MOCK_MESSAGES; } catch { return MOCK_MESSAGES; } });
  const [mockNotifs, setMockNotifs] = useState(() => { try { return JSON.parse(localStorage.getItem('ds_notifs')) || MOCK_NOTIFICATIONS; } catch { return MOCK_NOTIFICATIONS; } });
  const [mockActivity, setMockActivity] = useState(() => { try { return JSON.parse(localStorage.getItem('ds_activity')) || MOCK_ACTIVITY; } catch { return MOCK_ACTIVITY; } });

  // Persist mock data
  useEffect(() => { localStorage.setItem('ds_users', JSON.stringify(mockUsers)); }, [mockUsers]);
  useEffect(() => { localStorage.setItem('ds_projects', JSON.stringify(mockProjects)); }, [mockProjects]);
  useEffect(() => { localStorage.setItem('ds_tasks', JSON.stringify(mockTasks)); }, [mockTasks]);
  useEffect(() => { localStorage.setItem('ds_teams', JSON.stringify(mockTeams)); }, [mockTeams]);
  useEffect(() => { localStorage.setItem('ds_messages', JSON.stringify(mockMessages)); }, [mockMessages]);
  useEffect(() => { localStorage.setItem('ds_notifs', JSON.stringify(mockNotifs)); }, [mockNotifs]);
  useEffect(() => { localStorage.setItem('ds_activity', JSON.stringify(mockActivity)); }, [mockActivity]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ds_theme', theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem('ds_lang', lang); }, [lang]);

  // Compute unread notifications for current user
  useEffect(() => {
    if (user) {
      const count = mockNotifs.filter(n => n.userId === user.id && !n.lu).length;
      setNotifCount(count);
    }
  }, [mockNotifs, user]);

  const login = useCallback((userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('ds_user', JSON.stringify(userData));
    localStorage.setItem('ds_token', tokenData);
  }, []);

  const logout = useCallback(() => {
    setUser(null); setToken(null);
    localStorage.removeItem('ds_user'); localStorage.removeItem('ds_token');
  }, []);

  const toggleTheme = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), []);
  const toggleLang  = useCallback(() => setLang(l => l === 'fr' ? 'en' : 'fr'), []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // ── Activity log helper ──
  const logActivity = useCallback((action, cible, type) => {
    const entry = { id: uid(), userId: user?.id || 'u1', action, cible, type, date: now() };
    setMockActivity(prev => [entry, ...prev.slice(0, 49)]);
  }, [user]);

  // ── Add notification helper ──
  const addNotification = useCallback((userId, type, message, lien = '/') => {
    const notif = { _id: uid(), userId, type, message, lu: false, date: now(), lien };
    setMockNotifs(prev => [notif, ...prev]);
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AppContext.Provider value={{
      user, token, theme, lang, toasts, notifCount, setNotifCount,
      isAdmin, login, logout, toggleTheme, toggleLang, addToast, removeToast,
      // Mock data & setters
      mockUsers, setMockUsers,
      mockProjects, setMockProjects,
      mockTasks, setMockTasks,
      mockTeams, setMockTeams,
      mockMessages, setMockMessages,
      mockNotifs, setMockNotifs,
      mockActivity, setMockActivity,
      logActivity, addNotification,
      uid, now,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
