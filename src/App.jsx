import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import AuthPage          from './pages/AuthPage';
import DashboardPage     from './pages/DashboardPage';
import ProjectsPage      from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import KanbanPage        from './pages/KanbanPage';
import TeamsPage         from './pages/TeamsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage       from './pages/ProfilePage';
import AdminPage         from './pages/AdminPage';
import CalendarPage      from './pages/CalendarPage';
import ReportsPage       from './pages/ReportsPage';
import MessagesPage      from './pages/MessagesPage';
import MyTasksPage       from './pages/MyTasksPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, isAdmin } = useApp();
  if (!token) return <Navigate to="/auth" replace/>;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace/>;
  return children;
}

export default function App() {
  const { token } = useApp();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={token ? <Navigate to="/" replace/> : <AuthPage/>}/>
        <Route path="/" element={<ProtectedRoute><Layout><DashboardPage/></Layout></ProtectedRoute>}/>
        <Route path="/projects" element={<ProtectedRoute><Layout><ProjectsPage/></Layout></ProtectedRoute>}/>
        <Route path="/projects/:id" element={<ProtectedRoute><Layout><ProjectDetailPage/></Layout></ProtectedRoute>}/>
        <Route path="/projects/:id/kanban" element={<ProtectedRoute><Layout><KanbanPage/></Layout></ProtectedRoute>}/>
        <Route path="/my-tasks" element={<ProtectedRoute><Layout><MyTasksPage/></Layout></ProtectedRoute>}/>
        <Route path="/teams" element={<ProtectedRoute><Layout><TeamsPage/></Layout></ProtectedRoute>}/>
        <Route path="/messages" element={<ProtectedRoute><Layout><MessagesPage/></Layout></ProtectedRoute>}/>
        <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarPage/></Layout></ProtectedRoute>}/>
        <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage/></Layout></ProtectedRoute>}/>
        <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage/></Layout></ProtectedRoute>}/>
        <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPage/></Layout></ProtectedRoute>}/>
        <Route path="/reports" element={<ProtectedRoute adminOnly><Layout><ReportsPage/></Layout></ProtectedRoute>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  );
}
