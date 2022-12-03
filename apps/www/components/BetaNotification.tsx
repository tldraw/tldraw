import React, { useLayoutEffect } from 'react'

const STORAGE_KEY = 'tldraw_dismiss_beta_notification_2'

export function BetaNotification() {
  const [isDismissed, setIsDismissed] = React.useState(true)

  useLayoutEffect(() => {
    try {
      const storageIsDismissed = localStorage.getItem(STORAGE_KEY)

      if (storageIsDismissed !== null) {
        return
      } else {
        setIsDismissed(false)
      }
    } catch (err) {
      setIsDismissed(false)
    }
  }, [])

  const handleDismiss = React.useCallback(() => {
    setIsDismissed(true)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  if (isDismissed) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        left: 0,
        zIndex: 999,
        display: 'flex',
        fontSize: 'var(--fontSizes-2)',
        fontFamily: 'var(--fonts-ui)',
        color: '#fff',
        mixBlendMode: 'difference',
      }}
    >
      <a
        href="https://beta.tldraw.com"
        style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          fontSize: 'inherit',
          color: 'inherit',
        }}
        title="Try the new tldraw at beta.tldraw.com"
      >
        Try the new tldraw!
      </a>
      <button
        style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          color: 'inherit',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.8,
        }}
        title="Dismiss"
        onClick={handleDismiss}
      >
        ×
      </button>
    </div>
  )
}
