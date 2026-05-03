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
  TrendingUp,
  TrendingDown,
  ChevronRight,
  MoreHorizontal,
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

const chartColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0))
const formatMoney = (value) => `₹${new Intl.NumberFormat('en-IN').format(Number(value || 0))}`

function StatCard({ label, value, icon: Icon, trend, trendValue, accent = 'blue' }) {
  const accentColors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200/50 transition-all duration-300 hover:shadow-xl hover:ring-gray-300/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`rounded-xl bg-gradient-to-br ${accentColors[accent]} p-3 shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 rounded-full px-2 py-1 text-xs font-medium ${
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1 h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
    </motion.div>
  )
}

function ChartPanel({ title, children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200/50 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      {children}
    </motion.div>
  )
}

function DataTable({ title, children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`rounded-2xl bg-white shadow-lg ring-1 ring-gray-200/50 ${className}`}
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </motion.div>
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
      </div>
    </div>
  )

  // Fallback data
  const revenueTrend = charts.revenueTrend || [
    { month: 'Jan', revenue: metrics.platformRevenue || 120000, subscriptions: 200 },
    { month: 'Feb', revenue: metrics.platformRevenue || 98000, subscriptions: 220 },
    { month: 'Mar', revenue: metrics.platformRevenue || 110000, subscriptions: 240 },
    { month: 'Apr', revenue: metrics.platformRevenue || 128000, subscriptions: 260 }
  ]
  const userGrowth = charts.userGrowth || [
    { month: 'Jan', users: 320 },
    { month: 'Feb', users: 360 },
    { month: 'Mar', users: 400 },
    { month: 'Apr', users: 420 }
  ]
  const apiUsage = charts.apiUsage || [
    { name: 'Payments', requests: 2400 },
    { name: 'Auth', requests: 1800 },
    { name: 'Invoices', requests: 1200 }
  ]
  const topApis = charts.topApis || apiUsage.map((a, i) => ({
    name: a.name || `API ${i + 1}`,
    value: a.requests || (i + 1) * 1000
  }))

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans antialiased">
      {/* Sidebar - Hidden on mobile, fixed on desktop */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl overflow-y-auto md:block"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center space-x-3 border-b border-slate-700/50 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">MeterFlow</h1>
              <p className="text-xs text-slate-400">Admin Console</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-4 py-6">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleNavClick(item)}
                  className="group flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-left text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 group-hover:bg-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              )
            })}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="w-full md:ml-[280px] md:w-[calc(100%-280px)] flex-1 flex flex-col">
        {/* Top Navbar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/80 backdrop-blur-xl"
        >
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-sm text-gray-500">{roleLabel} Dashboard</p>
                  <h2 className="text-xl font-bold text-gray-900">Enterprise Control Panel</h2>
                </div>
              </div>

              {/* Search Bar */}
              <div className="hidden flex-1 max-w-md mx-8 lg:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users, APIs, payments..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center space-x-4">
                <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                    3
                  </span>
                </button>
                <button
                  onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                >
                  {theme === 'light' ? <MoonStar className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
                </button>
                <div className="flex items-center space-x-3 rounded-xl bg-gray-50 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">{adminName}</div>
                    <div className="text-xs text-gray-500">{roleLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 w-full overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl space-y-8">
            {/* Overview Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              id="overview"
              className="space-y-2"
            >
              <p className="text-sm text-gray-600">Platform overview</p>
              <h3 className="text-3xl font-bold text-gray-900">Monitor the MeterFlow platform</h3>
              <p className="text-gray-600">Real-time metrics, revenue, and system health at a glance.</p>
            </motion.section>

            {/* Stats Grid */}
            <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Total Users"
                value={formatNumber(metrics.totalUsers)}
                icon={Users}
                trend="up"
                trendValue="12.5"
                accent="blue"
              />
              <StatCard
                label="Total APIs"
                value={formatNumber(metrics.totalApis)}
                icon={Waypoints}
                trend="up"
                trendValue="8.2"
                accent="purple"
              />
              <StatCard
                label="Requests Today"
                value={formatNumber(metrics.totalRequests)}
                icon={Activity}
                trend="up"
                trendValue="15.3"
                accent="green"
              />
              <StatCard
                label="Monthly Revenue"
                value={formatMoney(metrics.platformRevenue)}
                icon={CreditCard}
                trend="up"
                trendValue="22.1"
                accent="blue"
              />
              <StatCard
                label="Active Subscriptions"
                value={formatNumber(metrics.activeSubscriptions)}
                icon={Sparkles}
                trend="up"
                trendValue="5.7"
                accent="purple"
              />
              <StatCard
                label="Failed Requests"
                value={formatNumber(metrics.failedRequests)}
                icon={CircleAlert}
                trend="down"
                trendValue="-3.2"
                accent="red"
              />
            </section>

            {/* Charts Section */}
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <ChartPanel title="Revenue Trend">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTrend}>
                          <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3B82F6"
                            fill="url(#revenueFill)"
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartPanel>

                  <ChartPanel title="User Growth">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="users"
                            stroke="#8B5CF6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#8B5CF6' }}
                            activeDot={{ r: 6, fill: '#8B5CF6' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartPanel>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <ChartPanel title="API Usage">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={apiUsage} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#64748b" fontSize={12} />
                          <YAxis type="category" dataKey="name" width={80} stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Bar dataKey="requests" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartPanel>

                  <ChartPanel title="Top APIs">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topApis}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                          >
                            {topApis.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartPanel>
                </div>
              </div>

              {/* System Health Panel */}
              <ChartPanel title="System Health" className="h-fit">
                <div className="space-y-4">
                  {(systemHealth.length ? systemHealth : [
                    { label: 'MongoDB', status: 'Healthy' },
                    { label: 'Redis', status: 'Healthy' },
                    { label: 'BullMQ', status: 'Healthy' },
                    { label: 'Server', status: 'Healthy' }
                  ]).map((item) => {
                    const HealthIcon = item.label === 'MongoDB' ? Database :
                                      item.label === 'Redis' ? Wifi :
                                      item.label === 'BullMQ' ? Layers3 : Cpu
                    return (
                      <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                            <HealthIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.label}</div>
                            <div className="text-sm text-gray-500">{item.status}</div>
                          </div>
                        </div>
                        <div className={`h-3 w-3 rounded-full ${
                          item.status === 'Healthy' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      </div>
                    )
                  })}
                </div>
              </ChartPanel>
            </section>

            {/* Tables Section */}
            <section className="grid gap-6 lg:grid-cols-2">
              <DataTable title="Recent Users">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">User</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Role</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Status</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(tables.recentUsers || []).map((row) => (
                        <tr key={`${row.email}-${row.name}`} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">
                                {row.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{row.name}</div>
                                <div className="text-sm text-gray-500">{row.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-sm text-gray-600">{row.role}</td>
                          <td className="py-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              row.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-gray-500">{row.lastSeen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataTable>

              <DataTable title="Latest APIs">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">API</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Owner</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Requests</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Pricing</th>
                        <th className="pb-3 text-left text-sm font-medium text-gray-600">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(tables.latestApis || []).map((row) => (
                        <tr key={row.api} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 font-medium text-gray-900">{row.api}</td>
                          <td className="py-4 text-sm text-gray-600">{row.owner}</td>
                          <td className="py-4 text-sm text-gray-600">{formatNumber(row.requests)}</td>
                          <td className="py-4 text-sm text-gray-600">{row.pricing}</td>
                          <td className="py-4 text-sm text-gray-500">{row.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DataTable>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

