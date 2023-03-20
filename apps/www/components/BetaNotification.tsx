import React, { useLayoutEffect } from 'react'
import { css, styled } from '~styles'

const STORAGE_KEY = 'tldraw_dismiss_beta_notification_3'

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
    <Panel>
      <div>
        tldraw will be offline on the 4th of April for a few hours from 9:30am UTC whilst we upgrade
        to our new version.
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginRight: -14,
          marginLeft: -14,
          marginBottom: -14,
        }}
      >
        <Button onClick={handleDismiss}>Dismiss</Button>
        <Link href="https://tldraw.substack.com/p/tldraws-upcoming-re-launch" target="_blank">
          Learn more →
        </Link>
      </div>
    </Panel>
  )
}

// const Link = styled('a', {
//   '&:hover': {
//     textDecoration: 'underline',
//   },
// })

const Panel = styled('div', {
  position: 'absolute',
  top: 42,
  left: 0,
  margin: 16,
  zIndex: 999,
  backgroundColor: '$panel',
  flexDirection: 'column',
  boxShadow: '$panel',
  padding: 16,
  fontSize: 'var(--fontSizes-2)',
  fontFamily: 'var(--fonts-ui)',
  width: 300,
  display: 'flex',
  gap: 8,
  border: '1px solid $panelContrast',
  overflow: 'hidden',
  borderRadius: 9,
})

const buttonStyles = css({
  borderRadius: '$2',
  backgroundColor: '$panel',
  padding: '0 14px',
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  border: 'none',
  '&:hover': {
    backgroundColor: '$hover',
  },
})

const Button = styled('button', buttonStyles)
const Link = styled('a', buttonStyles)
