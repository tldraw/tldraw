import * as React from 'react'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import styled from '~styles'
import { breakpoints } from '~components/breakpoints'

const statusSelector = (s: Data) => s.appState.status
const activeToolSelector = (s: Data) => s.appState.activeTool

export function StatusBar(): JSX.Element | null {
  const { useSelector } = useTLDrawContext()
  const status = useSelector(statusSelector)
  const activeTool = useSelector(activeToolSelector)

  return (
    <StyledStatusBar bp={breakpoints}>
      <StyledSection>
        {activeTool} | {status}
      </StyledSection>
    </StyledStatusBar>
  )
}

const StyledStatusBar = styled('div', {
  height: 40,
  userSelect: 'none',
  borderTop: '1px solid $border',
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
