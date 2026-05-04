import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { createCheckoutSession, verifyRazorpayPayment } from '../api/meterflow.js'

const PLAN_AMOUNT = 1

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

export default function PaymentPage() {
  const { token, user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePayNow = async () => {
    if (!token || loading) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await createCheckoutSession(token)
      const scriptLoaded = await loadRazorpayScript()

      if (!scriptLoaded) {
        throw new Error('Unable to load Razorpay checkout.')
      }

      const { keyId, orderId, amount, currency, merchantName, description } = response?.data || response

      if (!keyId || !orderId) {
        throw new Error('Unable to initialize Razorpay checkout.')
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: merchantName || 'MeterFlow',
        description: description || 'MeterFlow Pro subscription',
        order_id: orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async (paymentResponse) => {
          const verificationResponse = await verifyRazorpayPayment(token, paymentResponse)
          updateUser(verificationResponse?.user || { plan: 'pro' })
          navigate('/payment-success', { replace: true })
        },
        modal: {
          ondismiss: () => {
            navigate('/payment-cancelled', { replace: true })
          },
        },
      })

      razorpay.on('payment.failed', (paymentError) => {
        setError(paymentError?.error?.description || 'Payment failed. Please try again.')
      })

      razorpay.open()
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Unable to start checkout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="payment-page">
      <section className="payment-shell">
        <div className="payment-hero">
          <Link to="/consumer/dashboard" className="payment-back-link">
            <ArrowLeft size={16} /> Back to dashboard
          </Link>

          <div className="payment-badge">
            <Sparkles size={16} /> Subscription checkout
          </div>

          <h1>Upgrade to MeterFlow Pro</h1>
          <p className="payment-copy">
            Complete your subscription with secure Razorpay checkout.
          </p>
        </div>

        <div className="payment-grid">
          <article className="payment-card payment-summary-card">
            <div className="payment-card-header">
              <div>
                <span className="payment-kicker">Plan details</span>
                <h2>MeterFlow Pro</h2>
              </div>
              <div className="payment-price">₹{PLAN_AMOUNT}</div>
            </div>

            <ul className="payment-benefits">
              <li><CheckCircle2 size={16} /> Monthly recurring subscription</li>
              <li><CheckCircle2 size={16} /> API usage and billing dashboard</li>
              <li><CheckCircle2 size={16} /> Priority support and insights</li>
            </ul>

            <div className="payment-meta">
              <div>
                <span>Billing cycle</span>
                <strong>Monthly</strong>
              </div>
              <div>
                <span>Currency</span>
                <strong>INR</strong>
              </div>
              <div>
                <span>Account</span>
                <strong>{user?.email || 'Signed-in user'}</strong>
              </div>
            </div>
          </article>

          <article className="payment-card payment-action-card">
            <div className="payment-action-top">
              <CreditCard size={18} />
              <div>
                <span className="payment-kicker">Checkout total</span>
                <h2>₹{PLAN_AMOUNT}</h2>
              </div>
            </div>

            <p className="payment-copy small">
              You will open Razorpay checkout to complete the payment securely.
            </p>

            <button type="button" className="payment-pay-btn" onClick={handlePayNow} disabled={loading}>
              {loading ? 'Opening Razorpay...' : `Pay ₹${PLAN_AMOUNT}`}
            </button>

            {error ? <p className="payment-error">{error}</p> : null}

            <div className="payment-trust-row">
              <span><ShieldCheck size={14} /> Secure payment</span>
              <span>Managed by Razorpay</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}