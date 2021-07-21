import { useStateDesigner } from '@state-designer/react'
import state from 'state'
import styled from 'styles'

const size: any = { '@sm': 'small' }

export default function StatusBar(): JSX.Element {
  const local = useStateDesigner(state)

  const shapesInView = state.values.shapesToRender.length

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
    <StatusBarContainer size={size}>
      <Section>
        {active} - {log}
      </Section>
      <Section>{shapesInView || '0'} Shapes</Section>
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
