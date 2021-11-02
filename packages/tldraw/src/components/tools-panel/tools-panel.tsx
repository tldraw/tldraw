import * as React from 'react'
import css from '~styles'
import type { Data } from '~types'
import { useTLDrawContext } from '~hooks'
import { StatusBar } from './status-bar'
import { BackToContent } from './back-to-content'
import { PrimaryTools } from './primary-tools'
import { ActionButton } from './action-button'
import { LockButton } from './lock-button'

const isDebugModeSelector = (s: Data) => s.settings.isDebugMode

export const ToolsPanel = React.memo((): JSX.Element => {
  const { useSelector } = useTLDrawContext()

  const isDebugMode = useSelector(isDebugModeSelector)

  return (
    <div className={toolsPanelContainer()}>
      <div className={centerWrap()}>
        <BackToContent />
        <div className={primaryTools()}>
          <ActionButton />
          <PrimaryTools />
          <LockButton />
        </div>
      </div>
      {isDebugMode && (
        <div className={statusWrap()}>
          <StatusBar />
        </div>
      )}
    </div>
  )
})

const toolsPanelContainer = css({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto auto auto',
  gridTemplateRows: 'auto auto',
  justifyContent: 'space-between',
  padding: '0',
  alignItems: 'flex-end',
  zIndex: 200,
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const centerWrap = css({
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 12,
})

const statusWrap = css({
  gridRow: 2,
  gridColumn: '1 / span 3',
})

const primaryTools = css({
  position: 'relative',
  display: 'flex',
  gap: '$2',
})
