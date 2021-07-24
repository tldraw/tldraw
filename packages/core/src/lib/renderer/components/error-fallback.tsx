import * as React from 'react'
import { useTLContext } from '../hooks'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const ErrorFallback = React.memo(
  ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
    const { callbacks } = useTLContext()

    React.useEffect(() => {
      const copy =
        'Sorry, something went wrong. Press Ok to reset the document, or press cancel to continue and see if it resolves itself.'

      callbacks.onError?.(error)
      console.error(error)

      // Sentry.captureException(error)

      if (window.confirm(copy)) {
        callbacks.onResetDocument?.()
        resetErrorBoundary()
      }
    }, [error, resetErrorBoundary, callbacks])

    return <g />
  }
)
