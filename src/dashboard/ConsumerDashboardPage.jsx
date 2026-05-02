import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  FileDown,
  FileText,
  KeyRound,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Play,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Waypoints,
  Zap,
  SunMedium,
  MoonStar,
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
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  createConsumerApiKey,
  getConsumerApiCatalog,
  getConsumerDashboardSummary,
  logConsumerActivity,
} from '../api/meterflow.js'

const STORAGE_KEYS = { nav: 'meterflow_consumer_nav' }

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, sectionId: 'consumer-overview' },
  { label: 'My APIs', icon: Waypoints, route: '/consumer/my-apis' },
  { label: 'API Keys', icon: KeyRound, sectionId: 'api-key-management' },
  { label: 'Usage Analytics', icon: Activity, sectionId: 'analytics' },
  { label: 'Billing', icon: CreditCard, sectionId: 'billing-summary' },
  { label: 'Invoices', icon: Receipt, sectionId: 'invoice-history' },
  { label: 'Playground', icon: Play, sectionId: 'playground' },
  { label: 'Support', icon: Ticket, sectionId: 'support-center' },
  // Settings removed for consumer dashboard
]

const metricCards = [
  { label: 'Current Usage Cost', icon: CreditCard, tone: 'emerald' },
  { label: 'Remaining Credits', icon: Zap, tone: 'cyan' },
  { label: 'Active API Keys', icon: KeyRound, tone: 'violet' },
]

const playgroundEndpointOptions = [
  { label: 'Health Check', value: '/v1/health' },
  { label: 'List Resources', value: '/v1/resources' },
  { label: 'Get Subscription Status', value: '/v1/subscriptions/status' },
  { label: 'Generate API Key', value: 'generate-api-key' },
]

const dropdownOptions = ['My Profile', 'Payment Methods', 'Account Settings', 'Logout']

// Prefer actual data from the server; no hard-coded fallbacks.

const readStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback

  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0))

const formatCurrency = (value, currency = 'INR') => {
  const numericValue = Number(value || 0)

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(numericValue)
  } catch {
    return `₹${numericValue.toFixed(2)}`
  }
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const PanelCard = ({ id, title, subtitle, icon: Icon, action, className = '', children }) => (
  <section id={id} className={`consumer-panel ${className}`.trim()}>
    <div className="consumer-panel-header">
      <div>
        {subtitle ? <p className="consumer-kicker">{subtitle}</p> : null}
        <h3>
          {Icon ? <Icon size={16} /> : null}
          {title}
        </h3>
      </div>
      {action ? <div className="consumer-panel-action">{action}</div> : null}
    </div>
    {children}
  </section>
)

const EmptyChartState = ({ message }) => (
  <div style={{ minHeight: 250, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: '0.92rem' }}>
    <p style={{ margin: 0, textAlign: 'center' }}>{message}</p>
  </div>
)

const StatCard = ({ icon: Icon, tone, label, value, detail }) => (
  <article className={`consumer-stat-card tone-${tone}`}>
    <div className="consumer-stat-top">
      <div className="consumer-stat-icon">
        <Icon size={18} />
      </div>
    </div>
    <strong>{value}</strong>
    <span>{label}</span>
    {detail ? <small>{detail}</small> : null}
  </article>
)

const safeArray = (value) => (Array.isArray(value) ? value : [])

const mapRecentRequests = (summary) => {
  const requestItems = safeArray(summary?.recentRequests)
  if (requestItems.length) return requestItems

  return safeArray(summary?.recentActivity)
    .filter((item) => item?.type !== 'support_ticket_created')
    .slice(0, 4)
    .map((item, index) => ({
      id: item.id || `REQ-${index + 1}`,
      api: item.title || 'MeterFlow API',
      endpoint: item.endpoint || '/v1/health',
      method: item.method || 'GET',
      status: item.status || '200',
      latency: item.latency || item.responseTime || 120 + index * 24,
      timestamp: item.timestamp || new Date().toISOString(),
    }))
}

export default function ConsumerDashboardPage() {
  const { user, signOut, token } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNav, setActiveNav] = useState(() => readStorage(STORAGE_KEYS.nav, 'Dashboard'))
  const [searchValue, setSearchValue] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [theme, setTheme] = useState('light')
  const [selectedApiId, setSelectedApiId] = useState('')
  const [selectedEndpoint, setSelectedEndpoint] = useState('/v1/health')
  const [requestParams, setRequestParams] = useState('{\n  "limit": 10,\n  "status": "active"\n}')
  const [headers, setHeaders] = useState('Authorization: Bearer [token]\nContent-Type: application/json')
  const [playgroundResponse, setPlaygroundResponse] = useState('{\n  "message": "Run a request to preview the API response."\n}')
  const [playgroundLatency, setPlaygroundLatency] = useState('--')
  const [generatedKeyInfo, setGeneratedKeyInfo] = useState(null)
  const [apiCatalog, setApiCatalog] = useState([])
  const [catalogError, setCatalogError] = useState('')
  const [consumerSummary, setConsumerSummary] = useState(null)
  const [notice, setNotice] = useState('')

  const loadConsumerData = async () => {
    if (!token) return

    try {
      setCatalogError('')

      const [catalogResponse, summaryResponse] = await Promise.allSettled([
        getConsumerApiCatalog(token),
        getConsumerDashboardSummary(token),
      ])

      if (catalogResponse.status === 'fulfilled') {
        const catalog = Array.isArray(catalogResponse.value?.data)
          ? catalogResponse.value.data
          : []
        setApiCatalog(catalog)
        const firstCatalogApiId = catalog[0]?._id || catalog[0]?.id
        if (!selectedApiId && firstCatalogApiId) {
          setSelectedApiId(firstCatalogApiId)
        }
      } else {
        setApiCatalog([])
        setCatalogError(catalogResponse.reason?.response?.data?.message || 'Unable to load API catalog')
      }

      if (summaryResponse.status === 'fulfilled') {
        setConsumerSummary(summaryResponse.value?.data || null)
      } else {
        setConsumerSummary(null)
      }
    } catch (requestError) {
      setCatalogError(requestError?.response?.data?.message || 'Unable to load dashboard data')
    }
  }

  useEffect(() => {
    loadConsumerData()
  }, [token])

  useEffect(() => {
    try {
      document.documentElement.style.colorScheme = theme
      if (theme === 'dark') document.documentElement.classList.add('theme-dark')
      else document.documentElement.classList.remove('theme-dark')
    } catch {}
  }, [theme])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.nav, activeNav)
    } catch {
      // ignore
    }
  }, [activeNav])

  const summary = consumerSummary || {}
  const charts = summary.charts || {}
  const playgroundApis = useMemo(() => {
    const combined = [
      ...safeArray(summary.subscriptions),
      ...safeArray(summary.apis),
      ...safeArray(summary.providedApis),
      ...apiCatalog,
    ]

    const seen = new Set()

    return combined
      .map((api, index) => ({
        id: api.id || api._id || api.apiId || `api-${index}`,
        name: api.name || api.title || api.apiName || 'API',
        provider: api.provider?.name || api.providerName || api.provider || 'MeterFlow',
        plan: api.plan || summary.plan || 'Starter',
        requestsUsed: api.requestsUsed ?? api.usage?.requests ?? '—',
        status: api.status || 'Active',
        expiryDate: api.expiryDate || 'N/A',
        baseUrl: api.baseUrl || api.url || '',
        pricingPer100Requests: api.pricingPer100Requests,
        rateLimitPerMinute: api.rateLimitPerMinute,
        description: api.description,
        usage: api.usage,
        billing: api.billing,
      }))
      .filter((api) => {
        if (seen.has(api.id)) return false
        seen.add(api.id)
        return true
      })
  }, [apiCatalog, summary.apis, summary.plan, summary.providedApis, summary.subscriptions])

  const subscriptions = useMemo(() => {
    return playgroundApis
  }, [playgroundApis])

  const selectedApi = useMemo(() => {
    return subscriptions.find((api) => api.id === selectedApiId) || subscriptions[0] || null
  }, [selectedApiId, subscriptions])

  useEffect(() => {
    if (!selectedApiId && playgroundApis[0]?.id) {
      setSelectedApiId(playgroundApis[0].id)
    }
  }, [playgroundApis, selectedApiId])

  const dailyUsageData = Array.isArray(charts.dailyUsage)
    ? charts.dailyUsage.map((d) => ({ day: d.day || d.label || d.name, requests: d.requests ?? d.count ?? d.value ?? 0 }))
    : Array.isArray(charts.daily_usage)
    ? charts.daily_usage.map((d) => ({ day: d.day || d.label || d.name, requests: d.requests ?? d.count ?? d.value ?? 0 }))
    : []

  const monthlyCostData = Array.isArray(charts.monthlyCost)
    ? charts.monthlyCost.map((m) => ({ month: m.month || m.label || m.name, cost: m.cost ?? m.value ?? 0 }))
    : Array.isArray(charts.monthly_cost)
    ? charts.monthly_cost.map((m) => ({ month: m.month || m.label || m.name, cost: m.cost ?? m.value ?? 0 }))
    : []

  const responseTimeData = Array.isArray(charts.responseTime)
    ? charts.responseTime.map((r) => ({ api: r.api || r.name, latency: r.latency ?? r.value ?? 0 }))
    : Array.isArray(charts.response_time)
    ? charts.response_time.map((r) => ({ api: r.api || r.name, latency: r.latency ?? r.value ?? 0 }))
    : []

  const chartDailyUsage = dailyUsageData
  const chartMonthlyCost = monthlyCostData
  const chartResponseTime = responseTimeData
  const successMixData = Array.isArray(charts.successErrorMix)
    ? charts.successErrorMix.map((s) => ({ name: s.name, value: s.value }))
    : Array.isArray(charts.success_error_mix)
    ? charts.success_error_mix.map((s) => ({ name: s.name, value: s.value }))
    : []

  const recentRequests = Array.isArray(summary.recentRequests)
    ? summary.recentRequests
    : Array.isArray(summary.recentActivity)
    ? summary.recentActivity.filter((i) => i.type !== 'support_ticket_created')
    : []

  const invoiceHistory = Array.isArray(summary.invoices) ? summary.invoices : []
  const alerts = Array.isArray(summary.usageAlerts) ? summary.usageAlerts : []
  const activeNotifications = recentRequests.filter((request) => Number(request.status) >= 400).length + alerts.length

  const searchQuery = searchValue.trim().toLowerCase()
  const filteredSubscriptions = subscriptions.filter((api) => {
    if (!searchQuery) return true
    return [api.name, api.provider, api.baseUrl, api.status].some((field) => String(field || '').toLowerCase().includes(searchQuery))
  })
  const filteredRequests = recentRequests.filter((request) => {
    if (!searchQuery) return true
    return [request.api, request.endpoint, request.method, request.status].some((field) => String(field || '').toLowerCase().includes(searchQuery))
  })
  const filteredInvoices = invoiceHistory.filter((invoice) => {
    if (!searchQuery) return true
    return [invoice.number, invoice.period, invoice.status, invoice.amount].some((field) => String(field || '').toLowerCase().includes(searchQuery))
  })

  const metricValues = {
    'Current Usage Cost': summary.currentUsageCost ?? 0,
    'Remaining Credits': summary.freeCredits ?? 0,
    'Active API Keys': summary.activeApiKeys ?? 0,
  }

  const scrollToSection = (sectionId, navLabel) => {
    if (navLabel) setActiveNav(navLabel)
    const target = document.getElementById(sectionId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const onNavClick = (item) => {
    if (item.route) {
      navigate(item.route)
    } else {
      scrollToSection(item.sectionId, item.label)
    }
  }

  const refreshDashboard = async () => {
    await loadConsumerData()
    setNotice('Dashboard refreshed successfully.')
  }

  const onUpgradePlan = () => {
    navigate('/payment')
  }

  const onDropdownSelect = (option) => {
    setProfileOpen(false)

    if (option === 'My Profile') {
      scrollToSection('consumer-overview', 'Dashboard')
      return
    }

    if (option === 'Payment Methods') {
      navigate('/payment')
      return
    }

    if (option === 'Account Settings') {
      scrollToSection('billing-summary', 'Billing')
      return
    }

    if (option === 'Logout') {
      signOut()
    }
  }

  const onGenerateKeyClick = async (apiId) => {
    const targetApiId = apiId || selectedApi?.id || selectedApiId

    if (!token || !targetApiId) {
      setCatalogError('Select an API before generating a key.')
      return
    }

    try {
      const response = await createConsumerApiKey(token, targetApiId)
      const generatedKey = response?.data?.apiKey || response?.data?.key || 'Generated successfully'
      const generatedAt = response?.data?.createdAt || new Date().toISOString()
      setGeneratedKeyInfo({ key: generatedKey, createdAt: generatedAt })
      setPlaygroundResponse(
        JSON.stringify(
          {
            message: 'API key generated successfully.',
            apiId: targetApiId,
            apiKey: generatedKey,
            activeApiKeys: response?.data?.activeApiKeys,
            remainingFreeCredits: response?.data?.remainingFreeCredits,
            createdAt: generatedAt,
          },
          null,
          2,
        ),
      )
      setNotice('New API key generated.')
      setConsumerSummary((prev) => {
        if (!prev) return prev
        const activeApiKeys = Number(response?.data?.activeApiKeys ?? prev.activeApiKeys ?? 0)
        const freeCredits = Number(response?.data?.remainingFreeCredits ?? prev.freeCredits ?? 0)
        return { ...prev, activeApiKeys, freeCredits }
      })
      await loadConsumerData()
    } catch (requestError) {
      setCatalogError(requestError?.response?.data?.message || 'Unable to generate API key')
    }
  }

  const onSendPlaygroundRequest = () => {
    if (selectedEndpoint === 'generate-api-key') {
      onGenerateKeyClick()
      return
    }

    const selectedApiDoc = subscriptions.find((api) => api.id === selectedApiId) || selectedApi
    const previewLatency = Math.max(82, Math.round(Number(summary.avgLatency || 180) * 0.88))
    setPlaygroundLatency(String(previewLatency))
    setPlaygroundResponse(
      JSON.stringify(
        {
          message: 'Request preview prepared.',
          api: selectedApiDoc?.name || 'Selected API',
          endpoint: selectedEndpoint,
          method: 'GET',
          status: 200,
          latencyMs: previewLatency,
          params: requestParams,
          headers: headers.split('\n'),
        },
        null,
        2,
      ),
    )
    setNotice('Playground request preview ready.')
  }

  const onCreateNewTicket = async () => {
    if (!token) {
      setCatalogError('Authentication required to create a ticket')
      return
    }

    try {
      await logConsumerActivity(token, {
        type: 'support_ticket_created',
        title: 'Support ticket created',
        detail: 'Created from the consumer dashboard support panel.',
        metadata: { source: 'consumer-dashboard' },
      })
      await loadConsumerData()
      setNotice('Support ticket created successfully.')
    } catch (requestError) {
      setCatalogError(requestError?.response?.data?.message || 'Unable to create ticket')
    }
  }

  const onViewDocs = (api) => {
    if (api?.baseUrl) {
      window.open(api.baseUrl, '_blank', 'noopener,noreferrer')
      return
    }

    scrollToSection('subscribed-apis', 'My APIs')
  }

  const onOpenPlayground = (apiId) => {
    if (apiId) setSelectedApiId(apiId)
    scrollToSection('playground', 'Playground')
  }

  const chartHeight = 280
  const chartHeightLarge = 340

  const onDownloadInvoice = () => {
    const invoiceBody = [
      'MeterFlow Invoice',
      `Plan: ${summary.plan === 'pro' ? 'Pro' : 'Free'}`,
      `Usage charges: ${formatCurrency(summary.currentUsageCost || 0)}`,
      `Free credits remaining: ${summary.freeCredits ?? 0}`,
    ].join('\n')

    const blob = new Blob([invoiceBody], { type: 'text/plain;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = 'meterflow-invoice.txt'
    anchor.click()
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <main className={`consumer-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="consumer-sidebar">
        <div className="consumer-brand-row">
          <div className="consumer-brand-mark">
            <Sparkles size={18} />
          </div>
          {sidebarOpen && (
            <div>
              <h1>MeterFlow</h1>
              <p>Consumer Dashboard</p>
            </div>
          )}
        </div>

        <nav className="consumer-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.label

            return (
              <button
                key={item.label}
                type="button"
                className={`consumer-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onNavClick(item)}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="consumer-sidebar-footer">
          {sidebarOpen && (
            <div className="consumer-insight-chip">
              <ShieldCheck size={16} />
              <div>
                <span>Security posture</span>
                <strong>Protected</strong>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="consumer-main">
        <header className="consumer-topbar">
          <div className="consumer-topbar-left">
            <button
              type="button"
              className="consumer-icon-btn"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>

            <div>
              <p className="consumer-page-label">Consumer Dashboard</p>
              <h2>Monitor subscriptions, billing, and API performance</h2>
            </div>
          </div>

          <div className="consumer-searchbar">
            <Search size={16} />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search APIs, invoices, requests, keys..."
            />
          </div>

          <div className="consumer-topbar-right">
            <button type="button" className="consumer-refresh-btn" onClick={refreshDashboard}>
              <RotateCcw size={14} />
              Refresh
            </button>

            <button
              type="button"
              className="consumer-theme-toggle"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
            </button>

            <div className="consumer-profile-wrap">
              <button
                type="button"
                className="consumer-profile-chip"
                onClick={() => setProfileOpen((prev) => !prev)}
              >
                <div className="consumer-avatar">{(user?.name || 'M').charAt(0).toUpperCase()}</div>
                <div className="consumer-profile-copy">
                  <strong>{user?.name || 'Consumer'}</strong>
                  <span>{user?.email || 'consumer@meterflow.io'}</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {profileOpen && (
                <div className="consumer-profile-menu">
                  {dropdownOptions.map((option) => (
                    <button key={option} type="button" onClick={() => onDropdownSelect(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="consumer-logout-btn" onClick={signOut}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <section id="consumer-overview" className="consumer-hero">
          <div className="consumer-hero-copy">
            <p className="consumer-kicker">Enterprise billing workspace</p>
            <h3>MeterFlow Consumer Dashboard</h3>
            <p>
              Track your API subscriptions, request volume, cost trends, invoices, and response health from one polished workspace.
            </p>
            <div className="consumer-hero-actions">
              <button type="button" className="consumer-primary-btn" onClick={() => scrollToSection('playground', 'Playground')}>
                Open Playground
              </button>
              <button type="button" className="consumer-secondary-btn" onClick={() => scrollToSection('billing-summary', 'Billing')}>
                View Billing Summary
              </button>
            </div>
          </div>

          <div className="consumer-hero-panel">
            <div>
              <span>Remaining credits</span>
              <strong>{formatNumber(metricValues['Remaining Credits'])}</strong>
            </div>
          </div>
        </section>

        {catalogError ? <p className="consumer-message consumer-error">{catalogError}</p> : null}
        {notice ? <p className="consumer-message consumer-notice">{notice}</p> : null}

        <section className="consumer-stat-grid">
          {metricCards.map((card) => {
            const value = metricValues[card.label]
            const renderedValue = card.label === 'Current Usage Cost'
              ? formatCurrency(value || 0)
              : formatNumber(value)

            return (
              <StatCard
                key={card.label}
                icon={card.icon}
                tone={card.tone}
                label={card.label}
                value={renderedValue}
                detail={card.label === 'Remaining Credits' ? 'Free credits remaining' : ''}
              />
            )
          })}
        </section>

        <section id="analytics" className="consumer-chart-grid">
          <PanelCard title="Daily API Usage" subtitle="Requests across the last seven days" icon={Activity} className="span-two">
            <div className="consumer-chart-box large">
              {chartDailyUsage.length ? (
                <ResponsiveContainer width="100%" height={chartHeightLarge}>
                  <LineChart data={chartDailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                    <Tooltip />
                    <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No actual request data is available for the selected billing cycle." />
              )}
            </div>
          </PanelCard>

          <PanelCard title="Monthly Cost" subtitle="Billing trend for the current billing cycle" icon={CreditCard}>
            <div className="consumer-chart-box">
              {chartMonthlyCost.length ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={chartMonthlyCost}>
                    <defs>
                      <linearGradient id="consumerMonthlyCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                    <Tooltip />
                    <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="url(#consumerMonthlyCost)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No actual billing data is available yet." />
              )}
            </div>
          </PanelCard>

          <PanelCard title="Response Time" subtitle="Median latency by service" icon={Clock3}>
            <div className="consumer-chart-box">
              {chartResponseTime.length ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={chartResponseTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf7" />
                    <XAxis dataKey="api" tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis tickLine={false} axisLine={false} stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="latency" radius={[12, 12, 0, 0]} fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState message="No response-time samples are available yet." />
              )}
            </div>
          </PanelCard>
        </section>

        <section id="recent-requests" className="consumer-table-grid">
          <PanelCard
            title="Recent API Requests"
            subtitle="Traffic, status, and latency for the latest calls"
            icon={BarChart3}
            className="wide-table"
            action={<span className="consumer-chip">{filteredRequests.length} requests</span>}
          >
            <div className="consumer-table-wrap">
              <table className="consumer-table">
                <thead>
                  <tr>
                    <th>API</th>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id || `${request.endpoint}-${request.timestamp}`}>
                      <td>
                        <div className="table-title">
                          <strong>{request.api}</strong>
                          <span>{request.requestId || request.id || 'Live traffic'}</span>
                        </div>
                      </td>
                      <td>{request.endpoint}</td>
                      <td>{request.method}</td>
                      <td><span className={`status-pill ${Number(request.status) >= 400 ? 'pending' : 'active'}`}>{request.status}</span></td>
                      <td>{request.latency} ms</td>
                      <td>{formatDate(request.timestamp)}</td>
                    </tr>
                  ))}
                  {!filteredRequests.length && (
                    <tr>
                      <td colSpan={6}>No recent request data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>

          <PanelCard
            id="invoice-history"
            title="Invoice History"
            subtitle="Billing documents and payment state"
            icon={Receipt}
            className="wide-table"
            action={<button type="button" className="consumer-link-btn" onClick={onDownloadInvoice}><FileDown size={14} /> Download Latest</button>}
          >
            <div className="consumer-table-wrap">
              <table className="consumer-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.number}>
                      <td>
                        <div className="table-title">
                          <strong>{invoice.number}</strong>
                          <span>MeterFlow invoice</span>
                        </div>
                      </td>
                      <td>{invoice.period}</td>
                      <td>{invoice.amount}</td>
                      <td><span className={`status-pill ${invoice.status === 'Paid' ? 'active' : 'pending'}`}>{invoice.status}</span></td>
                      <td>{formatDate(invoice.dueDate)}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button"><FileText size={14} /> Download</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredInvoices.length && (
                    <tr>
                      <td colSpan={6}>No invoice history available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </section>

        <section className="consumer-bottom-grid">
          <PanelCard
            id="api-key-management"
            title="API Key Management"
            subtitle="Track generated keys, active counts, and latency"
            icon={KeyRound}
            action={<button type="button" className="consumer-chip-button" onClick={() => onGenerateKeyClick()}>Generate Key</button>}
          >
            <div className="support-summary-grid">
              <div>
                <span>Active API Keys</span>
                <strong>{formatNumber(summary.activeApiKeys ?? 0)}</strong>
              </div>
              <div>
                <span>Average Latency</span>
                <strong>{formatNumber(summary.avgLatency ?? 0)} ms</strong>
              </div>
            </div>
            <div className="support-list">
              <div className="support-row">
                <div>
                  <strong>Generated Key</strong>
                  <p style={{ wordBreak: 'break-all' }}>{generatedKeyInfo?.key || 'No key generated yet.'}</p>
                </div>
                <span className="status-pill active">Secure</span>
              </div>
              <div className="support-row">
                <div>
                  <strong>Generated Time</strong>
                  <p>{generatedKeyInfo?.createdAt ? formatDateTime(generatedKeyInfo.createdAt) : 'Generate a key to record the time.'}</p>
                </div>
                <span className="status-pill">Time</span>
              </div>
            </div>
          </PanelCard>

          <PanelCard id="billing-summary" title="Billing Summary" subtitle="Plan, usage, and payment health" icon={CreditCard}>
            <div className="billing-summary-grid">
              <div>
                <span>Current Plan</span>
                <strong>{summary.plan === 'pro' ? 'Pro' : 'Free'}</strong>
              </div>
              <div>
                <span>Usage Charges</span>
                <strong>{formatCurrency(summary.currentUsageCost || 0)}</strong>
              </div>
              <div>
                <span>Remaining Credits</span>
                <strong>{formatNumber(summary.freeCredits || 0)}</strong>
              </div>
              <div>
                <span>Payment Status</span>
                <strong>{summary.plan === 'pro' ? 'Active' : 'Monitor'}</strong>
              </div>
            </div>

            <div className="billing-progress">
              <span style={{ width: `${Math.min(100, Number(summary.currentUsageCost || 28) + 16)}%` }} />
            </div>

            <div className="billing-actions">
              <button type="button" className="consumer-primary-btn" onClick={onUpgradePlan}>
                Subscribe to Pro
              </button>
              <button type="button" className="consumer-secondary-btn" onClick={onDownloadInvoice}>
                <FileDown size={14} /> Download Invoice
              </button>
            </div>
          </PanelCard>

          <PanelCard id="playground" title="API Playground" subtitle="Test live endpoints before shipping changes" icon={Play}>
            <div className="playground-grid">
              <label>
                API Selector
                <select value={selectedApiId} onChange={(event) => setSelectedApiId(event.target.value)}>
                  <option value="">Select API</option>
                  {subscriptions.map((api) => (
                    <option key={api.id} value={api.id}>{api.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Endpoint
                <select value={selectedEndpoint} onChange={(event) => setSelectedEndpoint(event.target.value)}>
                  {playgroundEndpointOptions.map((endpoint) => (
                    <option key={endpoint.value} value={endpoint.value}>{endpoint.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Parameters
                <textarea rows={4} value={requestParams} onChange={(event) => setRequestParams(event.target.value)} />
              </label>

              <label>
                Headers
                <textarea rows={4} value={headers} onChange={(event) => setHeaders(event.target.value)} />
              </label>

              <button type="button" className="consumer-primary-btn playground-send" onClick={onSendPlaygroundRequest}>
                Send Request
              </button>

              <div className="response-meta">Response time: {playgroundLatency} ms</div>
              <pre className="playground-response">{playgroundResponse}</pre>
            </div>
          </PanelCard>

          <PanelCard id="support-center" title="Support Center" subtitle="Open tickets and support request tracking" icon={Ticket} action={<button type="button" className="consumer-chip-button" onClick={onCreateNewTicket}>Create New Ticket</button>}>
            <div className="support-summary-grid">
              <div>
                <span>Open Tickets</span>
                <strong>{summary.supportOpenTickets ?? 0}</strong>
              </div>
              <div>
                <span>Resolved This Week</span>
                <strong>{summary.supportResolvedThisWeek ?? 0}</strong>
              </div>
            </div>
            <div className="support-list">
              {alerts.map((item) => (
                <div key={item.title} className="support-row">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <span className={`status-pill ${item.severity === 'High' ? 'pending' : 'active'}`}>{item.severity}</span>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Workspace Settings removed per consumer UI requirements */}
        </section>
      </div>

    </main>
  )
}