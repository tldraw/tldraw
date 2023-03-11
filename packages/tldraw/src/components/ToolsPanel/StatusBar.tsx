import * as React from 'react'
import { breakpoints } from '~components/breakpoints'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'

const statusSelector = (s: TDSnapshot) => s.appState.status
const activeToolSelector = (s: TDSnapshot) => s.appState.activeTool

export function StatusBar() {
  const app = useTldrawApp()
  const status = app.useStore(statusSelector)
  const activeTool = app.useStore(activeToolSelector)

  return (
    <StyledStatusBar bp={breakpoints} id="TD-StatusBar">
      <StyledSection>
        {activeTool} | {status}
      </StyledSection>
    </StyledStatusBar>
  )
}

const StyledStatusBar = styled('div', {
  height: 40,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  borderTop: '1px solid $panelContrast',
  gridArea: 'status',
  display: 'flex',
  color: '$text',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '$panel',
  gap: 8,
  fontFamily: '$ui',
  fontSize: '$0',
  padding: '0 16px',

  variants: {
    bp: {
      small: {
        fontSize: '$1',
      },
    },
  },
})

const StyledSection = styled('div', {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
})
