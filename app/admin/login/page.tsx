'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(signInError.message || 'Invalid email or password.')
        return
      }

      // Verify authorized admin role from trusted app_metadata
      if (data.user?.app_metadata?.role !== 'admin') {
        // Immediately terminate session if user is not authorized admin
        await supabase.auth.signOut()
        setError('Access denied: Administrator privileges required.')
        return
      }

      // Hard redirect to propagate refreshed cookies immediately to Server Components & Middleware
      window.location.href = '/admin'
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-15%] w-[65%] h-[65%] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="glass-card relative z-10 w-full max-w-md p-8 border border-border/50 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="text-primary" size={24} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 font-display">Admin Secure Portal</h1>
        
        {error && <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-50/20 text-red-500 text-sm text-center">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Email</label>
            <input 
              type="text" 
              required
              autoComplete="email"
              placeholder="admin@modelschoolmanvad.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground/80">Password</label>
            <input 
              type="password" 
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-shimmer py-3 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
