import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AdminDashboardPage from './dashboard/AdminDashboardPage.jsx'
import ConsumerDashboardPage from './dashboard/ConsumerDashboardPage.jsx'
import MyApisPage from './dashboard/MyApisPage.jsx'
import DashboardPage from './dashboard/DashboardPage.jsx'
import PaymentPage from './payment/PaymentPage.jsx'
import {
  getDashboardPathForRole,
  normalizeRole,
  ROLE_ADMIN,
  ROLE_CONSUMER,
  ROLE_PROVIDER,
} from './auth/roles.js'
import { useAuth } from './context/AuthContext.jsx'
import './App.css'

const validatePassword = (password) => {
  const hasMinLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)

  if (!hasMinLength) return 'Password must be at least 8 characters long.'
  if (!hasUpper || !hasLower) return 'Password must include uppercase and lowercase letters.'
  if (!hasNumber) return 'Password must include at least one number.'

  return ''
}

function SignInPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await signIn({ email: form.email, password: form.password })
      
      if (!response?.user?.role) {
        setError('Invalid user data. Please try again.')
        setLoading(false)
        return
      }
      
      const dashboardPath = getDashboardPathForRole(response.user.role)
      navigate(dashboardPath, { replace: true })
    } catch (submitError) {
      const errorMsg = submitError?.response?.data?.message || 
                       submitError?.message || 
                       'Authentication failed. Please check your email and password.'
      setError(errorMsg)
      console.error('Login error:', submitError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p className="subtitle">Welcome back to MeterFlow.</p>

        <label className="field">
          <span>Email</span>
          <input
            name="email"
            value={form.email}
            onChange={onChange}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>

        <div className="field">
          <span>Password</span>
          <div className="password-wrap">
            <input
              name="password"
              value={form.password}
              onChange={onChange}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="primary-action" disabled={loading}>
          {loading ? 'Please wait...' : 'Sign in'}
        </button>

        {error && <p className="auth-error">{error}</p>}

        <p className="fine-print">
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </main>
  )
}

function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'consumer',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const passwordError = validatePassword(form.password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password must match.')
      return
    }

    setLoading(true)

    try {
      const response = await signUp({ name: form.name, email: form.email, password: form.password, role: form.role })
      
      if (response?.token && response?.user) {
        // Auto-login after signup
        const { persistAuth } = require('../context/AuthContext.jsx')
        // Note: can't use persistAuth directly here, so we'll redirect to signin
        window.alert('Account created successfully! Please log in.')
        navigate('/signin', { replace: true })
      } else {
        window.alert('Account created successfully! Please log in.')
        navigate('/signin', { replace: true })
      }
    } catch (submitError) {
      const errorMsg = submitError?.response?.data?.message || 
                       submitError?.message ||
                       'Account creation failed. Please try again.'
      setError(errorMsg)
      console.error('Signup error:', submitError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Sign up</h1>
        <p className="subtitle">Create your MeterFlow account.</p>

        <label className="field">
          <span>Full name</span>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            type="text"
            placeholder="Full name"
            autoComplete="name"
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            name="email"
            value={form.email}
            onChange={onChange}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Account Type</span>
          <select
            name="role"
            value={form.role}
            onChange={onChange}
            required
          >
            <option value="consumer">Consumer (Use APIs)</option>
            <option value="owner">Provider (Create APIs)</option>
          </select>
        </label>

        <div className="field">
          <span>Password</span>
          <div className="password-wrap">
            <input
              name="password"
              value={form.password}
              onChange={onChange}
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="field">
          <span>Confirm password</span>
          <div className="password-wrap">
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="primary-action" disabled={loading}>
          {loading ? 'Please wait...' : 'Create account'}
        </button>

        {error && <p className="auth-error">{error}</p>}

        <p className="fine-print">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </main>
  )
}

function DashboardRedirectRoute() {
  const { isAuthenticated, isHydrating, user } = useAuth()

  if (isHydrating) {
    return <div className="app-loading">Restoring your session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <Navigate to={getDashboardPathForRole(user?.role)} replace />
}

function RoleDashboardRoute({ requiredRole, component: Component }) {
  const { isAuthenticated, isHydrating, user } = useAuth()

  if (isHydrating) {
    return <div className="app-loading">Restoring your session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const currentRole = normalizeRole(user?.role)

  if (currentRole !== normalizeRole(requiredRole)) {
    return <Navigate to={getDashboardPathForRole(user?.role)} replace />
  }

  return <Component />
}

function PublicOnlyRoute() {
  const { isAuthenticated, isHydrating, user } = useAuth()

  if (isHydrating) {
    return <div className="app-loading">Preparing MeterFlow...</div>
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPathForRole(user?.role)} replace />
  }

  return <Navigate to="/signin" replace />
}

function PaymentResultPage({ title, message, redirectTo }) {
  const navigate = useNavigate()

  return (
    <main className="payment-page">
      <section className="payment-shell" style={{ textAlign: 'center' }}>
        <div className="payment-card" style={{ margin: '0 auto', maxWidth: 560 }}>
          <div className="payment-badge">Payment status</div>
          <h1 style={{ marginTop: 12 }}>{title}</h1>
          <p className="payment-copy">{message}</p>
          <button type="button" className="payment-pay-btn" onClick={() => navigate(redirectTo, { replace: true })}>
            Go to dashboard
          </button>
        </div>
      </section>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicOnlyRoute />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/dashboard" element={<DashboardRedirectRoute />} />
      <Route path="/admin/dashboard" element={<RoleDashboardRoute requiredRole={ROLE_ADMIN} component={AdminDashboardPage} />} />
      <Route path="/provider/dashboard" element={<RoleDashboardRoute requiredRole={ROLE_PROVIDER} component={DashboardPage} />} />
      <Route path="/consumer/dashboard" element={<RoleDashboardRoute requiredRole={ROLE_CONSUMER} component={ConsumerDashboardPage} />} />
      <Route path="/consumer/my-apis" element={<RoleDashboardRoute requiredRole={ROLE_CONSUMER} component={MyApisPage} />} />
      <Route path="/payment" element={<RoleDashboardRoute requiredRole={ROLE_CONSUMER} component={PaymentPage} />} />
      <Route path="/payment-success" element={<RoleDashboardRoute requiredRole={ROLE_CONSUMER} component={() => <PaymentResultPage title="Payment successful" message="Your Pro subscription is active." redirectTo="/consumer/dashboard" />} />} />
      <Route path="/payment-cancelled" element={<RoleDashboardRoute requiredRole={ROLE_CONSUMER} component={() => <PaymentResultPage title="Payment cancelled" message="No payment was completed." redirectTo="/consumer/dashboard" />} />} />
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  )
}

export default App