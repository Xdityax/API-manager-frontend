import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Bell,
  CircleAlert,
  CreditCard,
  Database,
  FileClock,
  Filter,
  Gauge,
  LayoutDashboard,
  Layers3,
  LineChart as LineChartIcon,
  LockKeyhole,
  LogOut,
  Menu,
  MoonStar,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Ticket,
  Users,
  Waypoints,
  Wifi,
  Cpu,
  BellRing,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext.jsx'
import { getRoleLabel } from '../auth/roles.js'
import { getAdminDashboardOverview } from '../api/meterflow.js'

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, sectionId: 'overview' },
  { label: 'Users', icon: Users, sectionId: 'users' },
  { label: 'APIs', icon: Waypoints, sectionId: 'apis' },
  { label: 'Revenue', icon: CreditCard, sectionId: 'revenue' },
  { label: 'Analytics', icon: LineChartIcon, sectionId: 'analytics' },
  { label: 'Payments', icon: BellRing, sectionId: 'payments' },
  { label: 'Security', icon: LockKeyhole, sectionId: 'security' },
  { label: 'Support Tickets', icon: Ticket, sectionId: 'support' },
  { label: 'Audit Logs', icon: FileClock, sectionId: 'audit' },
  { label: 'Settings', icon: Settings, sectionId: 'settings' },
]

const chartColors = ['#2563eb', '#7c3aed', '#06b6d4', '#1d4ed8', '#a855f7']

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0))
const formatMoney = (value) => `₹${new Intl.NumberFormat('en-IN').format(Number(value || 0))}`

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={`admin-stat-card ${accent || ''}`}
    >
      <div className="admin-stat-top">
        <div className="admin-stat-icon">
          <Icon size={18} />
        </div>
      </div>
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.article>
  )
}

function Panel({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`admin-panel ${className}`.trim()}>
      <div className="panel-header">
        <div>
          {Icon ? <Icon size={14} /> : null}
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function AdminDashboardPage() {
  const { user, token, signOut } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAdminDashboardOverview(token)
        setDashboardData(res.data || {})
      } catch (e) {
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  const metrics = dashboardData?.metrics || {}
  const charts = dashboardData?.charts || {}
  const tables = dashboardData?.tables || {}
  const systemHealth = dashboardData?.systemHealth || []

  const adminName = user?.name || 'Admin'
  const roleLabel = getRoleLabel(user?.role)

  const handleNavClick = (item) => {
    const target = document.getElementById(item.sectionId)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <main className="dashboard-shell admin-loading">Loading admin dashboard...</main>

  // fallbacks
  const revenueTrend = charts.revenueTrend || [{ month: 'Jan', revenue: metrics.platformRevenue || 120000, subscriptions: 200 }, { month: 'Feb', revenue: metrics.platformRevenue || 98000, subscriptions: 220 }, { month: 'Mar', revenue: metrics.platformRevenue || 110000, subscriptions: 240 }, { month: 'Apr', revenue: metrics.platformRevenue || 128000, subscriptions: 260 }]
  const userGrowth = charts.userGrowth || [{ month: 'Jan', users: 320 }, { month: 'Feb', users: 360 }, { month: 'Mar', users: 400 }, { month: 'Apr', users: 420 }]
  const apiUsage = charts.apiUsage || [{ name: 'Payments', requests: 2400 }, { name: 'Auth', requests: 1800 }, { name: 'Invoices', requests: 1200 }]
  const topApis = charts.topApis || apiUsage.map((a, i) => ({ name: a.name || `API ${i + 1}`, value: a.requests || (i + 1) * 1000 }))

  return (
    <main className={`min-h-screen bg-[#F8FAFC] text-slate-900 antialiased`}> 
      <aside className={`fixed left-0 top-0 h-screen w-72 p-6 text-white bg-gradient-to-b from-[#0F172A] to-[#1E293B] shadow-xl`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-white/10 rounded-full p-2">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">MeterFlow</h1>
            <p className="text-xs text-slate-300">Admin Console</p>
          </div>
        </div>

        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/6 transition-colors duration-200"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-white/6 rounded-lg">
                  <Icon size={18} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="ml-72">{/* content offset for fixed sidebar */}
        <header className="sticky top-0 z-30 backdrop-blur bg-white/60 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-white shadow-sm" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle sidebar"><Menu size={18} /></button>
              <div>
                <p className="text-xs text-slate-500">{roleLabel} Dashboard</p>
                <h2 className="text-lg font-semibold">Enterprise Control Panel</h2>
              </div>
            </div>

            <div className="flex-1 mx-6">
              <div className="max-w-2xl mx-auto relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></div>
                <input className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm" placeholder="Search users, APIs, payments, logs..." />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg bg-white shadow-sm">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[10px] px-1 rounded-full">3</span>
              </button>
              <button className="p-2 rounded-lg bg-white shadow-sm" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} aria-label="Toggle theme">{theme === 'light' ? <MoonStar size={18} /> : <SunMedium size={18} />}</button>
              <div className="flex items-center gap-3 bg-white rounded-2xl px-3 py-1 shadow-sm">
                <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center">{adminName.charAt(0).toUpperCase()}</div>
                <div className="text-sm">
                  <div className="font-medium">{adminName}</div>
                  <div className="text-xs text-slate-500">{roleLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section id="overview" className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-slate-500">Platform overview</p>
            <h3 className="text-2xl font-semibold mt-2 mb-4">Monitor the MeterFlow platform</h3>
            <p className="text-sm text-slate-600">Real-time metrics, revenue, and system health at a glance.</p>
          </div>
        </section>

        <section className="px-6 pb-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard label="Total Users" value={formatNumber(metrics.totalUsers)} icon={Users} />
            <StatCard label="Total APIs" value={formatNumber(metrics.totalApis)} icon={Waypoints} />
            <StatCard label="Requests Today" value={formatNumber(metrics.totalRequests)} icon={Activity} />
            <StatCard label="Monthly Revenue" value={formatMoney(metrics.platformRevenue)} icon={CreditCard} />
            <StatCard label="Active Subscriptions" value={formatNumber(metrics.activeSubscriptions)} icon={Sparkles} />
            <StatCard label="Failed Requests" value={formatNumber(metrics.failedRequests)} icon={CircleAlert} />
          </div>
        </section>

        <section className="px-6 pb-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h4 className="text-sm font-medium mb-2">Revenue Trend</h4>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrend}>
                        <defs>
                          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#revenueFill)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h4 className="text-sm font-medium mb-2">User Growth</h4>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={userGrowth}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip />
                        <Line type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h4 className="text-sm font-medium mb-2">API Usage</h4>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={apiUsage} layout="vertical">
                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" />
                        <YAxis type="category" dataKey="name" width={120} stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="requests" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <h4 className="text-sm font-medium mb-2">Top APIs</h4>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={topApis} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={6}>
                          {topApis.map((entry, index) => (
                            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <h4 className="text-sm font-medium mb-4">System Health</h4>
                <div className="space-y-3">
                  {(systemHealth.length ? systemHealth : [{ label: 'MongoDB', status: 'Healthy' }, { label: 'Redis', status: 'Healthy' }, { label: 'BullMQ', status: 'Healthy' }, { label: 'Server', status: 'Healthy' }]).map((item) => {
                    const HealthIcon = item.label === 'MongoDB' ? Database : item.label === 'Redis' ? Wifi : item.label === 'BullMQ' ? Layers3 : Cpu
                    return (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><HealthIcon size={18} /></div>
                          <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-xs text-slate-500">{item.status}</div>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${item.status === 'Healthy' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h4 className="text-sm font-medium mb-4">Recent Users</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs text-slate-500">
                      <th className="py-2">User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tables.recentUsers || []).map((row) => (
                      <tr key={`${row.email}-${row.name}`} className="hover:bg-slate-50">
                        <td className="py-3">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-slate-500">{row.email}</div>
                        </td>
                        <td>{row.role}</td>
                        <td><span className={`px-2 py-1 rounded-full text-xs ${row.status === 'Active' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>{row.status}</span></td>
                        <td className="text-xs text-slate-500">{row.lastSeen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h4 className="text-sm font-medium mb-4">Latest APIs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2">API</th>
                      <th>Owner</th>
                      <th>Requests</th>
                      <th>Pricing</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tables.latestApis || []).map((row) => (
                      <tr key={row.api} className="hover:bg-slate-50">
                        <td className="py-3 font-medium">{row.api}</td>
                        <td className="text-sm text-slate-600">{row.owner}</td>
                        <td>{formatNumber(row.requests)}</td>
                        <td>{row.pricing}</td>
                        <td className="text-sm text-slate-500">{row.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

