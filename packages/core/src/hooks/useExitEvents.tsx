import { useTLContext } from '../hooks'
import * as React from 'react'

export function useExitEvents() {
  const { callbacks } = useTLContext()

  React.useEffect(() => {
    const handleBeforeunload = (e: BeforeUnloadEvent) => {
      callbacks.onBeforeUnload?.(e)
    }

    window.addEventListener('beforeunload', handleBeforeunload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeunload)
    }
  }, [callbacks])
}
