import * as React from 'react'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import css from '~styles'

const statusSelector = (s: Data) => s.appState.status
const activeToolSelector = (s: Data) => s.appState.activeTool

export function StatusBar(): JSX.Element | null {
  const { useSelector } = useTLDrawContext()
  const status = useSelector(statusSelector)
  const activeTool = useSelector(activeToolSelector)

  return (
    <div className={statusBarContainer({ size: { '@sm': 'small' } })}>
      <div className={section()}>
        {activeTool} | {status}
      </div>
    </div>
  )
}

const statusBarContainer = css({
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

const section = css({
  whiteSpace: 'nowrap',
  overflow: 'hidden',
})
