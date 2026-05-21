import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppLayout from '@/layouts/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import RoleGuard from '@/components/RoleGuard'
import DesignSystemPage from '@/pages/DesignSystemPage'
import DashboardPage from '@/pages/DashboardPage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProjectPage from '@/pages/ProjectPage'
import TasksPage from '@/pages/TasksPage'
import TicketsPage from '@/pages/TicketsPage'
import SettingsPage from '@/pages/SettingsPage'
import UsersPage from '@/pages/UsersPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import AcceptInvitationPage from '@/pages/AcceptInvitationPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import ProfilePage from '@/pages/ProfilePage'
import SprintsPage from '@/pages/SprintsPage'
import TermsPage from '@/pages/TermsPage'
import PrivacyPage from '@/pages/PrivacyPage'
import ContactPage from '@/pages/ContactPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ReportsPage from '@/pages/admin/ReportsPage'
import TrashPage from '@/pages/admin/TrashPage'

function App() {
  return (
    <TooltipProvider delayDuration={300}>
    <BrowserRouter>
      <Toaster position="bottom-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route element={<RoleGuard feature="View sprints" />}>
              <Route path="/sprints" element={<SprintsPage />} />
            </Route>
            <Route path="/kanban" element={<div className="p-6 text-[#191b23]">Kanban Board (coming soon)</div>} />
            <Route path="/analytics" element={<div className="p-6 text-[#191b23]">Analytics (coming soon)</div>} />
            <Route element={<RoleGuard feature="View users" />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<RoleGuard feature="Workspace settings" />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RoleGuard feature="Manage trash" />}>
              <Route path="/admin/trash" element={<TrashPage />} />
            </Route>
            <Route path="/design-system" element={<DesignSystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </TooltipProvider>
  )
}

export default App
