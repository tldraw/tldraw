import { Utils } from '@tldraw/core'
import * as React from 'react'
import { styled } from '~styles'

/* -------------------------------------------------- */
/*                  Keyboard Shortcut                 */
/* -------------------------------------------------- */

const commandKey = () => (Utils.isDarwin() ? '⌘' : 'Ctrl')

export function Kbd({ variant, children }: { variant: 'tooltip' | 'menu'; children: string }) {
  const replaceK = (val: string) => {
    const objK: { [K in string]: string } = {
      '#': val.replace('#', commandKey()),
      '^': val.replace('^', 'alt'),
    }
    return objK[val] ?? val
  }

  return (
    <StyledKbd variant={variant}>
      {children.split('').map((k, i) => {
        return <span key={i}>{replaceK(k)}</span>
      })}
    </StyledKbd>
  )
}

export const StyledKbd = styled('kbd', {
  marginLeft: '$3',
  textShadow: '$2',
  textAlign: 'center',
  fontSize: '$1',
  fontFamily: '$ui',
  color: '$text',
  background: 'none',
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
        background: '$overlayContrast',
        boxShadow: '$key',
        minWidth: '20px',
        minHeight: '20px',
        padding: '0 5px',
        justifyContent: 'center',
        '& > span': {
          color: '$tooltipContrast',
        },
        // '& > span': {
        //   color: '$tooltipContrast',
        //   background: '$overlayContrast',
        //   boxShadow: '$key',
        //   width: '20px',
        //   height: '20px',
        // },
      },
      menu: {},
    },
  },
})
