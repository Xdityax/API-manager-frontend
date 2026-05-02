import { LogOut } from 'lucide-react'

export default function DashboardHeader({ userName, onLogout }) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="dashboard-kicker">MeterFlow Dashboard</p>
        <h1>Welcome, {userName || 'User'}</h1>
        <p className="dashboard-subtitle">Manage APIs, keys, usage, and billing from one workspace.</p>
      </div>
      <button type="button" className="dashboard-logout" onClick={onLogout}>
        <LogOut size={16} />
        Log out
      </button>
    </header>
  )
}
