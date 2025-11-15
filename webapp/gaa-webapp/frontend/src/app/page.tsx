'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { auth, setToken } from '@/lib/api-client'
import { PitchFinder } from '@/components/pitch-finder/PitchFinder'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

function HomePage() {
  const router = useRouter()
  
  // Auth / UI state
  const [isLogin, setIsLogin] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Typing animation state
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const [typingText, setTypingText] = useState('')

  // Typing animation effect
  useEffect(() => {
    const lines = [
      'Match highlights & key moments',
      'Complete game analysis',
      'AI tactical insights',
      'Player performance stats'
    ]

    let currentIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeout: NodeJS.Timeout

    const typeText = () => {
      const currentText = lines[currentIndex]
      
      if (!isDeleting) {
        setTypingText(currentText.substring(0, charIndex + 1))
        charIndex++
        
        if (charIndex === currentText.length) {
          timeout = setTimeout(() => {
            currentIndex = (currentIndex + 1) % lines.length
            setActiveLineIndex(currentIndex)
            isDeleting = true
            charIndex = currentText.length
            typeText()
          }, 2000)
          return
        }
      } else {
        setTypingText(currentText.substring(0, charIndex - 1))
        charIndex--
        
        if (charIndex === 0) {
          isDeleting = false
        }
      }
      
      const speed = isDeleting ? 30 : 60
      timeout = setTimeout(typeText, speed)
    }

    typeText()

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [])

  // Check API URL
  useEffect(() => {
    if (!API_BASE_URL) {
      console.error('Missing NEXT_PUBLIC_API_URL')
      setError('Configuration error. Please try again later.')
    }
  }, [])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!API_BASE_URL) {
      setError('Configuration error. Please try again later.')
      return
    }
    
    try {
      if (!isLogin && !termsAccepted) {
        setError('You must accept the Terms & Conditions to register')
        return
      }
    
      setIsSubmitting(true)
    
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const body = isLogin 
        ? { email, password }
        : { 
            email, 
            password,
            name: name || email.split('@')[0],
            phone
          }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Authentication failed')
        return
      }

      // Success
      setToken(data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/dashboard'
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError('Network error: ' + msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openSignIn = () => {
    setIsLogin(true)
    setShowAuthModal(true)
    setError(null)
  }

  const openGetStarted = () => {
    setIsLogin(false)
    setShowAuthModal(true)
    setError(null)
  }

  const handleClose = () => {
    setShowAuthModal(false)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      <style jsx global>{`
        :root {
          --gaa-green: #016F32;
          --gaa-blue: #4EC2CA;
          --gaa-bright-green: #D1FB7A;
          --gaa-light-blue: #B9E8EB;
        }
      `}</style>

      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 bg-gray-800/0 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="cursor-pointer">
              <Image
                src="/clann-logo-white.png"
                alt="ClannAI"
                width={90}
                height={24}
                className="h-6 w-auto"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={openSignIn}
                className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-md shadow-sm hover:bg-gray-100 hover:shadow"
              >
                Sign in
              </button>
              <button
                onClick={openGetStarted}
                className="bg-black px-4 py-2 rounded-md text-sm font-semibold text-white hover:bg-gray-900"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="relative z-10">
        <div className="relative min-h-screen">
          {/* Hero Video Background - Fixed Position */}
          <div className="fixed inset-0 w-full h-full -z-10">
            <video
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            >
              <source src="/hero-video.mp4" type="video/mp4" />
            </video>

            {/* Gradient Overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(17,24,39,0.3) 0%, rgba(17,24,39,0.2) 50%, rgba(17,24,39,0.8) 100%)',
              }}
            />
          </div>

          {/* Hero Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Empty space above hero text */}
            <div className="h-[35vh]" />

            {/* Three simple step cards */}
            <div className="max-w-7xl mx-auto px-4 mb-8 mt-20">
              <div className="grid grid-cols-3 gap-3 md:gap-6">
                {/* Step 1 */}
                <div className="rounded-3xl bg-black/40 border border-gray-700/30 overflow-hidden relative">
                  <div className="p-3 md:p-5 text-center">
                    <div className="text-xs md:text-sm font-bold mb-1" style={{ color: 'var(--gaa-bright-green)' }}>Step 1</div>
                    <h3 className="text-sm md:text-lg font-bold text-white mb-1">📹 Upload footage</h3>
                    <p className="text-xs md:text-sm text-white/90 mb-2 md:mb-3">VEO, Trace, Spiideo or any MP4</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-3xl bg-black/40 border border-gray-700/30 p-3 md:p-5 text-center">
                  <div className="text-xs md:text-sm font-bold mb-1" style={{ color: 'var(--gaa-blue)' }}>Step 2</div>
                  <h3 className="text-sm md:text-lg font-bold text-white mb-2">ClannAI creates</h3>
                  <div className="text-xs md:text-sm text-white/90 space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <span>🎬</span>
                      <span className={activeLineIndex === 0 ? 'text-[var(--gaa-bright-green)]' : ''}>
                        {activeLineIndex === 0 ? (
                          <>
                            {typingText}
                            <span className="animate-pulse">|</span>
                          </>
                        ) : (
                          'Match highlights & key moments'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span>📊</span>
                      <span className={activeLineIndex === 1 ? 'text-[var(--gaa-bright-green)]' : ''}>
                        {activeLineIndex === 1 ? (
                          <>
                            {typingText}
                            <span className="animate-pulse">|</span>
                          </>
                        ) : (
                          'Complete game analysis'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span>🤖</span>
                      <span className={activeLineIndex === 2 ? 'text-[var(--gaa-bright-green)]' : ''}>
                        {activeLineIndex === 2 ? (
                          <>
                            {typingText}
                            <span className="animate-pulse">|</span>
                          </>
                        ) : (
                          'AI tactical insights'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span>⚽</span>
                      <span className={activeLineIndex === 3 ? 'text-[var(--gaa-bright-green)]' : ''}>
                        {activeLineIndex === 3 ? (
                          <>
                            {typingText}
                            <span className="animate-pulse">|</span>
                          </>
                        ) : (
                          'Player performance stats'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="rounded-3xl bg-black/40 border border-gray-700/30 p-3 md:p-5 text-center">
                  <div className="text-xs md:text-sm font-bold mb-1" style={{ color: 'var(--gaa-light-blue)' }}>Step 3</div>
                  <h3 className="text-sm md:text-lg font-bold text-white mb-1">🔒 Sign up now</h3>
                  <p className="text-xs md:text-sm text-white/90 mb-2 md:mb-3">Get started with GAA analysis</p>
                  <button
                    onClick={openGetStarted}
                    className="px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-semibold text-xs md:text-sm bg-[var(--gaa-green)] hover:bg-[#015928] text-white transition-all"
                  >
                    Join Now
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="max-w-2xl mx-auto px-4 pt-4 pb-10 text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={openGetStarted}
                  className="px-6 py-3 bg-[var(--gaa-green)] hover:bg-[#015928] text-white font-semibold rounded-lg transition-all duration-200 text-sm hover:shadow-lg transform hover:scale-105"
                >
                  Get Started Free
                </button>
              </div>
            </div>

            {/* Pitch Finder Section */}
            <div className="max-w-7xl mx-auto px-4 py-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-white">
                Find Your Club
              </h2>
              <p className="text-gray-300 text-center mb-8">
                Search for your GAA club on the map of Ireland
              </p>
              <PitchFinder />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image
                src="/clann-logo-white.png"
                alt="ClannAI"
                width={60}
                height={16}
                className="h-4 w-auto"
                style={{ width: 'auto', height: 'auto' }}
              />
              <span className="ml-3 text-gray-400 text-sm">© 2025 ClannAI. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 flex items-center justify-center z-30" style={{ pointerEvents: 'none' }}>
          <div
            className="rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              pointerEvents: 'auto',
            }}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold text-white">
                {isLogin ? 'Sign In' : 'Create Account'}
              </h2>
              <button 
                onClick={handleClose}
                className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/50 transition-all"
                aria-label="Close sign-in modal"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-5 py-4 rounded-xl mb-6 backdrop-blur-sm">
                {error}
              </div>
            )}
              
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {!isLogin && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none transition-all bg-black/60 border border-gray-600/50 focus:bg-black/80"
                />
              )}

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none transition-all bg-black/60 border border-gray-600/50 focus:bg-black/80"
                required
              />
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none transition-all bg-black/60 border border-gray-600/50 focus:bg-black/80"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {!isLogin && (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number (Optional)"
                  className="w-full rounded-xl px-5 py-4 text-white placeholder-gray-400 focus:outline-none transition-all bg-black/60 border border-gray-600/50 focus:bg-black/80"
                />
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 mt-6 bg-[var(--gaa-green)] hover:bg-[#015928] hover:shadow-lg hover:shadow-green-500/25 ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLogin
                  ? isSubmitting
                    ? 'Signing In…'
                    : 'Sign In'
                  : isSubmitting
                  ? 'Creating Account…'
                  : 'Create Account'}
              </button>
            </form>

            {!isLogin && (
              <div className="mt-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 rounded border-gray-800 bg-black text-green-500 focus:ring-green-500/30"
                  />
                  <span className="text-sm text-gray-300 leading-relaxed">
                    I accept the{' '}
                    <a
                      href="/terms"
                      className="text-green-400 hover:text-green-300 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms &amp; Conditions
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      className="text-green-400 hover:text-green-300 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>
            )}

            <div className="mt-8 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage

