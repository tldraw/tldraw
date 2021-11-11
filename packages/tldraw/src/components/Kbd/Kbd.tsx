import * as React from 'react'
import { styled } from '~styles'
import { Utils } from '@tldraw/core'

/* -------------------------------------------------- */
/*                  Keyboard Shortcut                 */
/* -------------------------------------------------- */

const commandKey = () => (Utils.isDarwin() ? '⌘' : 'Ctrl')

export function Kbd({
  variant,
  children,
}: {
  variant: 'tooltip' | 'menu'
  children: string
}): JSX.Element | null {
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
  color: '$text',
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
          color: '$tooltipText',
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
