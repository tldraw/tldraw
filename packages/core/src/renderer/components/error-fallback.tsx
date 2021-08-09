import * as React from 'react'
import { useTLContext } from '../hooks'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const ErrorFallback = React.memo(({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  const { callbacks } = useTLContext()

  React.useEffect(() => {
    callbacks.onError?.(error)
    console.error(error)
  }, [error, resetErrorBoundary, callbacks])

  return null
})
