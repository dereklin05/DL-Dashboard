'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [message, setMessage] = useState('')
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!configured) return
    setMessage('')
    const supabase = createClient()
    if (isCreatingAccount) {
      const { error } = await supabase.auth.signUp({ email, password })
      setMessage(
        error
          ? error.message
          : 'Check your email to confirm the account, then sign in.',
      )
      return
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return setMessage(error.message)
    window.location.assign('/')
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark">
          <LockKeyhole size={21} />
        </div>
        <p className="eyebrow">PRIVATE DASHBOARD</p>
        <h1>{isCreatingAccount ? 'Create your account' : 'Welcome back'}</h1>
        <p>
          {isCreatingAccount
            ? 'Create the one account that can access your synced dashboard.'
            : 'Sign in to view your personal dashboard.'}
        </p>
        {!configured ? (
          <p className="login-error">
            Add your Supabase URL and publishable key to enable sign-in.
          </p>
        ) : (
          <>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
            {message && <p className="login-error">{message}</p>}
            <button className="login-submit" type="submit">
              {isCreatingAccount ? 'Create account' : 'Sign in'}{' '}
              <ArrowRight size={16} />
            </button>
            <button
              className="login-switch"
              type="button"
              onClick={() => {
                setIsCreatingAccount((value) => !value)
                setMessage('')
              }}
            >
              {isCreatingAccount
                ? 'Already have an account? Sign in'
                : 'First time here? Create an account'}
            </button>
          </>
        )}
      </form>
    </main>
  )
}
