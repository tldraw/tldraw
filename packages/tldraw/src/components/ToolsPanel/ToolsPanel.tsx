import * as React from 'react'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { useTldrawApp } from '~hooks'
import { StatusBar } from './StatusBar'
import { BackToContent } from './BackToContent'
import { PrimaryTools } from './PrimaryTools'
import { ActionButton } from './ActionButton'
import { DeleteButton } from './DeleteButton'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

interface ToolsPanelProps {
  onBlur?: React.FocusEventHandler
}

export const ToolsPanel = React.memo(function ToolsPanel({ onBlur }: ToolsPanelProps) {
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)
  const dockPosition = app.useStore(dockPositionState)

  const bottomStyle = { width: '100%', height: 'min-content', left: 0, right: 0 }
  const rightStyle = { width: 'min-content', height: '100%', right: 0 }
  const leftStyle = { width: 'min-content', height: '100%', left: 0 }
  const style =
    dockPosition === 'bottom' ? bottomStyle : dockPosition === 'left' ? leftStyle : rightStyle

  return (
    <StyledToolsPanelContainer
      style={{
        ...style,
      }}
      onBlur={onBlur}
    >
      <StyledCenterWrap id="TD-Tools">
        <BackToContent />
        <StyledPrimaryTools style={{ flexDirection: dockPosition === 'bottom' ? 'row' : 'column' }}>
          <ActionButton />
          <PrimaryTools />
          <DeleteButton />
        </StyledPrimaryTools>
      </StyledCenterWrap>
      {isDebugMode && (
        <StyledStatusWrap>
          <StatusBar />
        </StyledStatusWrap>
      )}
    </StyledToolsPanelContainer>
  )
})

const StyledToolsPanelContainer = styled('div', {
  position: 'absolute',
  bottom: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto auto auto',
  gridTemplateRows: 'auto auto',
  justifyContent: 'space-between',
  padding: '0',
  gap: '$4',
  zIndex: 200,
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const StyledCenterWrap = styled('div', {
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: '$4',
})

const StyledStatusWrap = styled('div', {
  gridRow: 2,
  gridColumn: '1 / span 3',
})

const StyledPrimaryTools = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
})
