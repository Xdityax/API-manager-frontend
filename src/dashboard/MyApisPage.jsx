import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, FileDown, LogOut, Menu, MoonStar, Search, Settings, Sparkles, SunMedium, Waypoints } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { createConsumerApiKey, getConsumerApiCatalog, getConsumerDashboardSummary } from '../api/meterflow.js'

const readStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback
  try {
    return window.localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

const PanelCard = ({ title, subtitle, icon: Icon, action, children, className = '' }) => (
  <section className={`consumer-panel ${className}`.trim()}>
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

export default function MyApisPage() {
  const { user, signOut, token } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState('light')
  const [searchValue, setSearchValue] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [apiCatalog, setApiCatalog] = useState([])
  const [catalogError, setCatalogError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedApiId, setSelectedApiId] = useState('')

  const loadConsumerData = async () => {
    if (!token) return
    try {
      setCatalogError('')
      const response = await getConsumerApiCatalog(token)
      const catalog = Array.isArray(response?.data) ? response.data : []
      setApiCatalog(catalog)
      if (!selectedApiId && catalog[0]) {
        setSelectedApiId(catalog[0]._id)
      }
    } catch (err) {
      setApiCatalog([])
      setCatalogError(err?.response?.data?.message || 'Unable to load APIs')
    }
  }

  useEffect(() => {
    loadConsumerData()
  }, [token])

  useEffect(() => {
    try {
      document.documentElement.style.colorScheme = theme
    } catch {}
  }, [theme])

  const playgroundApis = useMemo(() => {
    return apiCatalog.map((api) => ({
      id: api._id,
      name: api.name,
      provider: api.provider?.name || 'Provider',
      plan: 'Free',
      requestsUsed: '—',
      status: 'Active',
      baseUrl: api.baseUrl || '',
      pricingPer100Requests: api.pricingPer100Requests,
      rateLimitPerMinute: api.rateLimitPerMinute,
      description: api.description,
    }))
  }, [apiCatalog])

  const filteredSubscriptions = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return playgroundApis
    return playgroundApis.filter((api) =>
      [api.name, api.provider, api.baseUrl, api.status].some((field) =>
        String(field || '').toLowerCase().includes(query)
      )
    )
  }, [playgroundApis, searchValue])

  const onViewDocs = (api) => {
    alert(`Documentation for ${api.name} would open here`)
  }

  const onOpenPlayground = (apiId) => {
    navigate('/consumer/dashboard')
  }

  const onGenerateKeyClick = async (apiId) => {
    const targetApiId = apiId || selectedApiId
    if (!token || !targetApiId) {
      setCatalogError('Select an API before generating a key.')
      return
    }

    try {
      setCatalogError('')
      setNotice('')
      const response = await createConsumerApiKey(token, targetApiId)
      const activeApiKeys = response?.data?.activeApiKeys
      const remainingFreeCredits = response?.data?.remainingFreeCredits
      setNotice(
        `API key generated successfully${typeof activeApiKeys === 'number' ? `. Active keys: ${activeApiKeys}` : ''}${typeof remainingFreeCredits === 'number' ? `. Free credits left: ${remainingFreeCredits}` : ''}.`
      )
      await loadConsumerData()
    } catch (requestError) {
      setCatalogError(requestError?.response?.data?.message || 'Unable to generate API key')
    }
  }

  const onDropdownSelect = (option) => {
    setProfileOpen(false)
    if (option === 'Logout') {
      signOut()
    }
  }

  return (
    <main className={`admin-shell ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="brand-block">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          {sidebarOpen && (
            <div>
              <h1>MeterFlow</h1>
              <p>Consumer Workspace</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className="sidebar-item active"
            onClick={() => {}}
          >
            <Waypoints size={18} />
            {sidebarOpen && <span>My APIs</span>}
          </button>
          <button
            type="button"
            className="sidebar-item"
            onClick={() => navigate('/consumer/dashboard')}
          >
            <Menu size={18} />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
        </nav>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-circle-btn"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="topbar-title">
              <p>My APIs</p>
              <h2>Browse and manage all available APIs</h2>
            </div>
          </div>

          <div className="topbar-center">
            <Search size={16} />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search APIs, providers..."
            />
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="icon-circle-btn"
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            >
              {theme === 'light' ? <MoonStar size={18} /> : <SunMedium size={18} />}
            </button>

            <div className="consumer-profile-wrap">
              <button
                type="button"
                className="profile-chip profile-dropdown-trigger"
                onClick={() => setProfileOpen((prev) => !prev)}
              >
                <div className="profile-avatar">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
                <div className="profile-copy">
                  <strong>{user?.name || 'Consumer'}</strong>
                  <span>{user?.email || 'consumer@meterflow.io'}</span>
                </div>
                <ChevronDown size={14} />
              </button>

              {profileOpen && (
                <div className="consumer-profile-menu">
                  <button type="button" onClick={() => onDropdownSelect('Logout')}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="consumer-table-grid">
          <PanelCard
            title="Available APIs"
            subtitle="Services available to this consumer workspace"
            icon={Waypoints}
            className="wide-table"
            action={<span className="consumer-chip">{filteredSubscriptions.length} APIs</span>}
          >
            {notice ? <p style={{ color: '#14532d', padding: '0 1rem 1rem' }}>{notice}</p> : null}
            {catalogError && <p style={{ color: 'red', padding: '1rem' }}>{catalogError}</p>}
            <div className="consumer-table-wrap">
              <table className="consumer-table">
                <thead>
                  <tr>
                    <th>API</th>
                    <th>Provider</th>
                    <th>Plan</th>
                    <th>Requests Used</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((api) => (
                    <tr key={api.id}>
                      <td>
                        <div className="table-title">
                          <strong>{api.name}</strong>
                          <span>{api.baseUrl || 'Connected endpoint'}</span>
                        </div>
                      </td>
                      <td>{api.provider}</td>
                      <td>{api.plan}</td>
                      <td>{api.requestsUsed || '—'}</td>
                      <td>
                        <span className="status-pill active">{api.status}</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" onClick={() => onViewDocs(api)}>
                            View Docs
                          </button>
                          <button type="button" onClick={() => onOpenPlayground(api.id)}>
                            Playground
                          </button>
                          <button type="button" onClick={() => onGenerateKeyClick(api.id)}>
                            Generate Key
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredSubscriptions.length && (
                    <tr>
                      <td colSpan={6}>
                        {catalogError || 'No API data available.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </section>
      </div>
    </main>
  )
}
