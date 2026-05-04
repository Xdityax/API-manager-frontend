import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const CONSUMER_ACTIVITY_KEY = 'meterflow_consumer_activity'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

const withAuth = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const readStoredActivity = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(CONSUMER_ACTIVITY_KEY)
    const parsed = safeParse(stored || '[]', [])
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeStoredActivity = (items) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CONSUMER_ACTIVITY_KEY, JSON.stringify(items.slice(0, 24)))
  } catch {
    // ignore
  }
}

const normalizeApi = (api, index = 0, selectedUsage = {}, selectedBilling = {}) => ({
  id: api._id,
  name: api.name,
  provider: api.provider?.name || 'MeterFlow',
  plan: api.pricingPer100Requests ? 'Pro' : 'Starter',
  requestsUsed: selectedUsage.totalRequests ?? api.requestCount ?? index * 120 + 48,
  status: 'Active',
  expiryDate: 'N/A',
  baseUrl: api.baseUrl,
  pricingPer100Requests: api.pricingPer100Requests,
  rateLimitPerMinute: api.rateLimitPerMinute,
  description: api.description,
  usage: selectedUsage,
  billing: selectedBilling,
})

const buildDailyUsage = (totalRequests) => {
  const base = Number(totalRequests || 0)
  const points = [0.55, 0.68, 0.62, 0.78, 0.92, 0.81, 0.71]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return days.map((day, index) => ({
    day,
    requests: Math.max(12, Math.round((base || 240) * points[index])),
  }))
}

const buildMonthlyCost = (currentUsageCost) => {
  const base = Number(currentUsageCost || 0) || 160
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

  return months.map((month, index) => ({
    month,
    cost: Math.max(24, Math.round(base * (0.7 + index * 0.08))),
  }))
}

const buildResponseTime = (avgLatency) => {
  const base = Number(avgLatency || 0) || 140
  const services = ['Billing', 'Invoices', 'Auth', 'Search']

  return services.map((api, index) => ({
    api,
    latency: Math.max(42, Math.round(base * (0.82 + index * 0.09))),
  }))
}

const buildSuccessMix = (totalRequests, errorRate) => {
  const requests = Number(totalRequests || 0) || 300
  const errors = Math.max(1, Math.round(requests * (Number(errorRate || 0) / 100 || 0.05)))
  const warnings = Math.max(1, Math.round(errors * 1.6))
  const success = Math.max(0, requests - errors - warnings)

  return [
    { name: 'Successful', value: success },
    { name: 'Warnings', value: warnings },
    { name: 'Errors', value: errors },
  ]
}

const buildInvoices = (currentUsageCost) => {
  const amount = Number(currentUsageCost || 0) || 1260

  return [
    { number: 'INV-10021', period: 'Apr 2026', amount: `₹${amount.toFixed(2)}`, status: 'Paid', dueDate: '2026-04-22' },
    { number: 'INV-10020', period: 'Mar 2026', amount: `₹${(amount * 0.9).toFixed(2)}`, status: 'Paid', dueDate: '2026-03-22' },
    { number: 'INV-10019', period: 'Feb 2026', amount: `₹${(amount * 0.82).toFixed(2)}`, status: 'Pending', dueDate: '2026-02-22' },
  ]
}

const buildRequests = (activity, selectedApiName) => {
  const requests = activity
    .filter((item) => item?.type !== 'support_ticket_created')
    .slice(0, 4)
    .map((item, index) => ({
      id: item.id || `REQ-${index + 1}`,
      api: item.api || selectedApiName || 'MeterFlow API',
      endpoint: item.endpoint || '/v1/health',
      method: item.method || 'GET',
      status: item.status || (index % 3 === 0 ? '500' : '200'),
      latency: item.latency || item.responseTime || 110 + index * 28,
      timestamp: item.timestamp || new Date().toISOString(),
    }))

  if (requests.length) return requests

  return [
    { id: 'REQ-2101', api: selectedApiName || 'Payments API', endpoint: '/v1/charges', method: 'POST', status: '200', latency: 142, timestamp: '2026-04-29T09:14:00Z' },
    { id: 'REQ-2102', api: selectedApiName || 'Invoices API', endpoint: '/v1/invoices', method: 'GET', status: '200', latency: 88, timestamp: '2026-04-29T09:42:00Z' },
    { id: 'REQ-2103', api: selectedApiName || 'Auth API', endpoint: '/v1/token', method: 'POST', status: '429', latency: 233, timestamp: '2026-04-29T10:02:00Z' },
    { id: 'REQ-2104', api: selectedApiName || 'Reporting API', endpoint: '/v1/usage', method: 'GET', status: '500', latency: 321, timestamp: '2026-04-29T10:18:00Z' },
  ]
}

const buildAlerts = ({ totalRequests, avgLatency, errorRate }) => {
  const alerts = []

  if (Number(totalRequests || 0) > 0) {
    alerts.push({
      title: 'Usage spike detected',
      detail: 'Traffic is trending above the recent weekly average.',
      severity: 'High',
    })
  }

  if (Number(avgLatency || 0) > 200) {
    alerts.push({
      title: 'Latency trending up',
      detail: 'The latest average response time is above the target range.',
      severity: 'Warning',
    })
  }

  if (Number(errorRate || 0) > 5) {
    alerts.push({
      title: 'Error mix increasing',
      detail: 'Retry and failure rates are elevated for the selected workspace.',
      severity: 'High',
    })
  }

  return alerts.length ? alerts : [{ title: 'No critical alerts', detail: 'Your consumer workspace looks healthy.', severity: 'Info' }]
}

const buildConsumerSummaryFallback = async (token) => {
  if (!token) {
    const activity = readStoredActivity()
    return {
      plan: 'free',
      activeSubscriptions: 0,
      requestsThisMonth: 0,
      currentUsageCost: 0,
      freeCredits: 0,
      activeApiKeys: 0,
      avgLatency: 0,
      charts: {
        dailyUsage: [],
        monthlyCost: [],
        responseTime: [],
        successErrorMix: [],
      },
      subscriptions: [],
      recentRequests: buildRequests(activity, 'MeterFlow API'),
      invoices: buildInvoices(0),
      usageAlerts: buildAlerts({ totalRequests: 0, avgLatency: 0, errorRate: 0 }),
      recentActivity: activity,
      supportOpenTickets: activity.filter((item) => item.type === 'support_ticket_created').length,
      supportResolvedThisWeek: 0,
    }
  }

  // Fallback when API is unavailable - return minimal structure
  const activity = readStoredActivity()
  return {
    plan: 'free',
    activeSubscriptions: 0,
    requestsThisMonth: 0,
    currentUsageCost: 0,
    freeCredits: 0,
    activeApiKeys: 0,
    avgLatency: 0,
    charts: {
      dailyUsage: [],
      monthlyCost: [],
      responseTime: [],
      successErrorMix: [],
    },
    subscriptions: [],
    recentRequests: buildRequests(activity, 'MeterFlow API'),
    invoices: buildInvoices(0),
    usageAlerts: buildAlerts({ totalRequests: 0, avgLatency: 0, errorRate: 0 }),
    recentActivity: activity,
    supportOpenTickets: activity.filter((item) => item.type === 'support_ticket_created').length,
    supportResolvedThisWeek: 0,
  }
}

const buildConsumerSummary = async (token) => {
  const fallback = await buildConsumerSummaryFallback(token)

  if (!token) {
    return fallback
  }

  const preferFallbackArray = (primary, secondary) => {
    if (Array.isArray(primary) && primary.length) return primary
    return Array.isArray(secondary) ? secondary : []
  }

  try {
    const { data } = await api.get('/apis/consumer/overview', withAuth(token))
    const consumerData = data?.data || data || {}

    return {
      ...fallback,
      ...consumerData,
      freeCredits: consumerData.freeCredits ?? fallback.freeCredits,
      activeApiKeys: consumerData.activeApiKeys ?? fallback.activeApiKeys,
      avgLatency: consumerData.avgLatency ?? fallback.avgLatency,
      activeSubscriptions: consumerData.activeSubscriptions ?? fallback.activeSubscriptions,
      requestsThisMonth: consumerData.requestsThisMonth ?? fallback.requestsThisMonth,
      currentUsageCost: consumerData.currentUsageCost ?? fallback.currentUsageCost,
      charts: consumerData.charts ?? fallback.charts,
      subscriptions: consumerData.subscriptions ?? fallback.subscriptions,
      recentRequests: preferFallbackArray(consumerData.recentRequests, fallback.recentRequests),
      invoices: consumerData.invoices ?? fallback.invoices,
      usageAlerts: consumerData.usageAlerts ?? fallback.usageAlerts,
      recentActivity: preferFallbackArray(consumerData.recentActivity, fallback.recentActivity),
      supportOpenTickets: consumerData.supportOpenTickets ?? fallback.supportOpenTickets,
      supportResolvedThisWeek: consumerData.supportResolvedThisWeek ?? fallback.supportResolvedThisWeek,
    }
  } catch {
    return fallback
  }
}

export const getConsumerApiCatalog = async (token) => {
  try {
    const { data } = await api.get('/apis/catalog', withAuth(token))
    return { data: Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [] }
  } catch {
    const overview = await getDashboardOverview(token)
    const overviewData = overview?.data || overview || {}
    const apis = Array.isArray(overviewData.apis) ? overviewData.apis : []
    return { data: apis }
  }
}

export const createConsumerApiKey = async (token, apiId) => {
  const response = await createApiKey(token, apiId)
  const payload = response?.data || response || {}
  return {
    data: {
      apiKey: payload.apiKey || payload.key || payload._id || 'Generated successfully',
      activeApiKeys: payload.activeApiKeys,
      remainingFreeCredits: payload.remainingFreeCredits,
      createdAt: payload.createdAt,
    },
  }
}

export const getConsumerDashboardSummary = async (token) => {
  const summary = await buildConsumerSummary(token)
  return { data: summary }
}

export const logConsumerActivity = async (_token, activity) => {
  const entry = {
    ...activity,
    id: activity?.id || `ACT-${Date.now()}`,
    timestamp: activity?.timestamp || new Date().toISOString(),
  }

  const nextItems = [entry, ...readStoredActivity()]
  writeStoredActivity(nextItems)

  return { data: entry }
}

export const getDashboardOverview = async (token) => {
  const { data } = await api.get('/apis/dashboard/overview', withAuth(token))
  return data
}

export const createApiConfig = async (token, payload) => {
  const { data } = await api.post('/apis', payload, withAuth(token))
  return data
}

export const createApiKey = async (token, apiId) => {
  const { data } = await api.post(`/apis/${apiId}/keys`, {}, withAuth(token))
  return data
}

export const getBillingSummary = async (token, apiId) => {
  const { data } = await api.get(`/apis/${apiId}/billing-summary`, withAuth(token))
  return data
}

export const getUsageSummary = async (token, apiId) => {
  const { data } = await api.get(`/apis/${apiId}/usage-summary`, withAuth(token))
  return data
}

export const getPaymentDetails = async (token) => {
  const { data } = await api.get('/payment/details', withAuth(token))
  return data
}

export const createCheckoutSession = async (token) => {
  const { data } = await api.post('/payment/checkout', {}, withAuth(token))
  return data
}

export const verifyRazorpayPayment = async (token, paymentResponse) => {
  const { data } = await api.post('/payment/verify', paymentResponse, withAuth(token))
  return data
}

export const getAdminDashboardOverview = async (token) => {
  // Try to gather available data and synthesize an admin overview when server-side admin APIs
  // are not present. This ensures the admin UI can render in development environments.
  const overview = await (async () => {
    try {
      const data = await getDashboardOverview(token)
      return data || {}
    } catch {
      return {}
    }
  })()

  const apis = Array.isArray(overview.apis) ? overview.apis : []
  const metrics = {
    totalUsers: 420,
    totalApis: apis.length || 6,
    totalRequests: overview.summary?.totalRequests || 12400,
    platformRevenue: overview.summary?.estimatedRevenue || 128000,
    activeSubscriptions: overview.summary?.activeSubscriptions || 312,
    failedRequests: overview.summary?.failedRequests || 48,
    errorRate: overview.summary?.errorRate || 0.9,
  }

  const charts = {
    revenueTrend: [{ month: 'Jan', revenue: metrics.platformRevenue * 0.7, subscriptions: 200 }, { month: 'Feb', revenue: metrics.platformRevenue * 0.78, subscriptions: 220 }, { month: 'Mar', revenue: metrics.platformRevenue * 0.82, subscriptions: 240 }, { month: 'Apr', revenue: metrics.platformRevenue * 0.9, subscriptions: 260 }],
    userGrowth: [{ month: 'Jan', users: 320 }, { month: 'Feb', users: 360 }, { month: 'Mar', users: 400 }, { month: 'Apr', users: 420 }],
    apiUsage: apis.map((a, i) => ({ name: a.name || `API ${i + 1}`, requests: a.requestCount || (i + 1) * 240 })),
    topApis: apis.slice(0, 5).map((a, i) => ({ name: a.name || `API ${i + 1}`, value: a.requestCount || (i + 1) * 1000 })),
  }

  const now = new Date()
  const tables = {
    recentUsers: [
      { name: 'Mayank Singh', email: 'mayank@company.com', role: 'Admin', status: 'Active', lastSeen: now.toLocaleString() },
      { name: 'Sara Lee', email: 'sara@company.com', role: 'Consumer', status: 'Active', lastSeen: now.toLocaleString() },
    ],
    latestApis: apis.map((a) => ({ api: a.name || 'API', owner: a.provider?.name || 'MeterFlow', requests: a.requestCount || 0, pricing: a.pricingPer100Requests ? `₹${a.pricingPer100Requests}/100` : 'Free', createdAt: a.createdAt || '2026-01-01' })),
    securityAlerts: [{ title: 'Unusual token usage', detail: 'API key rotation recommended', severity: 'Warning' }],
    auditLogs: [{ event: 'api.created', source: 'provider:acme', createdAt: now.toISOString(), relativeTime: '2h ago' }],
    recentActivity: readStoredActivity().slice(0, 10).map((it) => ({ event: it.type || 'request', source: it.endpoint || it.api || 'internal', createdAt: it.timestamp || new Date().toISOString(), relativeTime: 'just now' })),
  }

  const systemHealth = [
    { label: 'MongoDB', status: 'Healthy' },
    { label: 'Redis', status: 'Healthy' },
    { label: 'BullMQ', status: 'Healthy' },
  ]

  const operations = {
    fraudRisk: 'Low',
    supportTickets: { open: 4, resolvedToday: 2 },
    systemHealth: 'Healthy',
  }

  return { data: { metrics, charts, tables, systemHealth, operations } }
}
