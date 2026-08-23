'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null

  return (
    <button
      className="icon-button"
      aria-label="Sign out"
      title="Sign out"
      onClick={async () => {
        await createClient().auth.signOut()
        window.location.assign('/login')
      }}
    >
      <LogOut size={15} />
    </button>
  )
}
