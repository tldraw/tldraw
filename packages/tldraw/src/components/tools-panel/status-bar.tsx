import * as React from 'react'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import styled from '~styles'

const statusSelector = (s: Data) => s.appState.status.current
const activeToolSelector = (s: Data) => s.appState.activeTool

export function StatusBar(): JSX.Element | null {
  const { useSelector } = useTLDrawContext()
  const status = useSelector(statusSelector)
  const activeTool = useSelector(activeToolSelector)

  return (
    <StatusBarContainer size={{ '@sm': 'small' }}>
      <Section>
        {activeTool} | {status}
      </Section>
    </StatusBarContainer>
  )
}

const StatusBarContainer = styled('div', {
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
    size: {
      small: {
        fontSize: '$1',
      },
    },
  },
})

const Section = styled('div', {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
})
