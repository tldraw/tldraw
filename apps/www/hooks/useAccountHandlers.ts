import * as React from 'react'
import { signIn, signOut } from 'next-auth/client'

export function useAccountHandlers() {
  const onSignIn = React.useCallback(() => {
    signIn()
  }, [])

  const onSignOut = React.useCallback(() => {
    signOut()
  }, [])

  return { onSignIn, onSignOut }
}
