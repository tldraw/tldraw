import * as React from 'react'
import css from '~styles'
import { Utils } from '@tldraw/core'

/* -------------------------------------------------- */
/*                  Keyboard Shortcut                 */
/* -------------------------------------------------- */

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
  return (
    <kbd className={kbd({ variant })}>
      {children
        .replaceAll('#', commandKey())
        .split('')
        .map((k, i) => (
          <span key={i}>{k}</span>
        ))}
    </kbd>
  )
}

export const kbd = css({
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
