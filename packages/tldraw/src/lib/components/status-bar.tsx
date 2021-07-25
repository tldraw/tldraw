import { useStateDesigner } from '@state-designer/react'
import styled from '../styles'
import { state } from '../state'

export function StatusBar(): JSX.Element | null {
  const local = useStateDesigner(state.state)

  // const shapesInView = local.values.shapesToRender.length

  const active = local.active
    .slice(1)
    .map((s) => {
      const states = s.split('.')
      return states[states.length - 1]
    })
    .join(' | ')

  const log = local.log[0]

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <StatusBarContainer size={{ '@sm': 'small' }}>
      <Section>
        {active} - {log}
      </Section>
      {/* <Section>{shapesInView || '0'} Shapes</Section> */}
    </StatusBarContainer>
  )
}

const StatusBarContainer = styled('div', {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 200,
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
