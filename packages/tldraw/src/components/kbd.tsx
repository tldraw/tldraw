import * as React from 'react'
import styled from '../styles'
import { Utils } from '@tldraw/core'

export function commandKey(): string {
  return Utils.isDarwin() ? '⌘' : 'Ctrl'
}

export function Kbd({
  variant,
  children,
}: {
  variant: 'tooltip' | 'menu'
  children: string
}): JSX.Element | null {
  if (Utils.isMobile()) return null
  return (
    <StyledKbd variant={variant}>
      {children
        .replaceAll('#', commandKey())
        .split('')
        .map((k, i) => (
          <span key={i}>{k}</span>
        ))}
    </StyledKbd>
  )
}

export const StyledKbd = styled('kbd', {
  marginLeft: '$3',
  textShadow: '$2',
  textAlign: 'center',
  fontSize: '$0',
  fontFamily: '$ui',
  fontWeight: 400,
  gap: '$1',
  display: 'flex',
  alignItems: 'center',

  '& > span': {
    padding: '$0',
    borderRadius: '$0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  variants: {
    variant: {
      tooltip: {
        '& > span': {
          background: '$overlayContrast',
          boxShadow: '$key',
          width: '20px',
          height: '20px',
        },
      },
      menu: {},
    },
  },
})
