import { useEffect, useMemo, useState } from 'react'
import DashboardHeader from './DashboardHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  createApiConfig,
  createApiKey,
  getBillingSummary,
  getDashboardOverview,
  getUsageSummary,
} from '../api/meterflow.js'

export default function DashboardPage() {
  const { user, token, signOut } = useAuth()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedApiId, setSelectedApiId] = useState('')
  const [usageSummary, setUsageSummary] = useState(null)
  const [billingSummary, setBillingSummary] = useState(null)
  const [form, setForm] = useState({
    name: '',
    baseUrl: '',
    description: '',
    pricingPer100Requests: '0.5',
    rateLimitPerMinute: '60',
  })

  const summaryCards = useMemo(() => {
    if (!overview?.summary) return []

    return [
      { label: 'Active APIs', value: String(overview.summary.activeApis) },
      { label: 'Requests tracked', value: String(overview.summary.totalRequests) },
      { label: 'Active API keys', value: String(overview.summary.activeApiKeys) },
      { label: 'Error rate', value: `${overview.summary.errorRate}%` },
      { label: 'Avg. latency', value: `${overview.summary.avgLatency} ms` },
      { label: 'Estimated billing', value: `₹${overview?.summary?.totalRequests ? overview.summary.totalRequests * 2 : overview?.summary?.estimatedRevenue ?? 0}` },
    ]
  }, [overview])

  const loadOverview = async () => {
    try {
      setError('')
      const response = await getDashboardOverview(token)
      setOverview(response.data)

      if (!selectedApiId && response.data.apis.length > 0) {
        setSelectedApiId(response.data.apis[0]._id)
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load dashboard overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  useEffect(() => {
    const loadSelectedApiStats = async () => {
      if (!selectedApiId) {
        setUsageSummary(null)
        setBillingSummary(null)
        return
      }

      try {
        const [usageRes, billingRes] = await Promise.all([
          getUsageSummary(token, selectedApiId),
          getBillingSummary(token, selectedApiId),
        ])

        setUsageSummary(usageRes.data)
        setBillingSummary(billingRes.data)
      } catch (statsError) {
        setUsageSummary(null)
        setBillingSummary(null)
      }
    }

    loadSelectedApiStats()
  }, [selectedApiId, token])

  const onFormChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onCreateApi = async (event) => {
    event.preventDefault()
    setNotice('')
    setError('')

    try {
      await createApiConfig(token, {
        name: form.name,
        baseUrl: form.baseUrl,
        description: form.description,
        pricingPer100Requests: Number(form.pricingPer100Requests),
        rateLimitPerMinute: Number(form.rateLimitPerMinute),
      })

      setForm({
        name: '',
        baseUrl: '',
        description: '',
        pricingPer100Requests: '0.5',
        rateLimitPerMinute: '60',
      })
      setNotice('API created successfully.')
      await loadOverview()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to create API')
    }
  }

  const onGenerateKey = async (apiId) => {
    setNotice('')
    setError('')

    try {
      const response = await createApiKey(token, apiId)
      setNotice(`New API key generated: ${response.data.key}`)
      await loadOverview()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to generate API key')
    }
  }

  if (loading) {
    return <main className="dashboard-page"><p>Loading dashboard...</p></main>
  }

  return (
    <main className="dashboard-page">
      <DashboardHeader userName={user?.name} onLogout={signOut} />

      {error && <p className="dashboard-error">{error}</p>}
      {notice && <p className="dashboard-notice">{notice}</p>}

      <section className="dashboard-summary">
        {summaryCards.map((item) => (
          <article key={item.label} className="dashboard-summary-card">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-actions-grid">
        <article className="dashboard-card">
          <h2>Create API</h2>
          <form className="dashboard-form" onSubmit={onCreateApi}>
            <input name="name" value={form.name} onChange={onFormChange} placeholder="API Name" required />
            <input name="baseUrl" value={form.baseUrl} onChange={onFormChange} placeholder="Base URL" required />
            <input name="description" value={form.description} onChange={onFormChange} placeholder="Description" />
            <div className="dashboard-form-row">
              <input
                name="pricingPer100Requests"
                value={form.pricingPer100Requests}
                onChange={onFormChange}
                placeholder="Price/100 req"
                type="number"
                step="0.1"
                min="0.1"
                required
              />
              <input
                name="rateLimitPerMinute"
                value={form.rateLimitPerMinute}
                onChange={onFormChange}
                placeholder="Rate/min"
                type="number"
                min="1"
                required
              />
            </div>
            <button type="submit" className="dashboard-primary-btn">Create API</button>
          </form>
        </article>

        <article className="dashboard-card">
          <h2>Your APIs</h2>
          {overview?.apis?.length ? (
            <div className="dashboard-api-list">
              {overview.apis.map((api) => (
                <div key={api._id} className="dashboard-api-item">
                  <div>
                    <strong>{api.name}</strong>
                    <p>{api.baseUrl}</p>
                  </div>
                  <div className="dashboard-api-actions">
                    <button type="button" onClick={() => setSelectedApiId(api._id)}>Select</button>
                    <button type="button" onClick={() => onGenerateKey(api._id)}>Generate Key</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No APIs created yet.</p>
          )}
        </article>

        <article className="dashboard-card">
          <h2>Selected API Metrics</h2>
          {selectedApiId ? (
            <div className="dashboard-metrics">
              <p>Total requests: {usageSummary?.totalRequests ?? 0}</p>
              <p>Avg latency: {usageSummary?.avgLatency ?? 0} ms</p>
              <p>Error count: {usageSummary?.errorCount ?? 0}</p>
              <p>Billable requests: {billingSummary?.totalRequests ?? 0}</p>
              <p>Estimated amount: ₹{billingSummary?.amount ?? 0}</p>
            </div>
          ) : (
            <p>Select an API to view usage and billing summary.</p>
          )}
        </article>
      </section>
    </main>
  )
}
