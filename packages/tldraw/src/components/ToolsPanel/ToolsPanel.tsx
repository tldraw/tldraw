import * as React from 'react'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { useMediaQuery, useTldrawApp } from '~hooks'
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
  const isMobile = useMediaQuery('(max-width: 900px)')

  const bottomStyle = {
    width: '100%',
    height: 'min-content',
    left: 0,
    right: 0,
    bottom: isDebugMode ? 40 : 0,
  }
  const topStyle = {
    width: '100%',
    height: 'min-content',
    left: 0,
    right: 0,
    top: isMobile ? 60 : 10,
  }
  const rightStyle = { width: 'min-content', height: '100%', right: 0 }
  const leftStyle = { width: 'min-content', height: '100%', left: 10 }

  const toolStyle = () => {
    switch (dockPosition) {
      case 'bottom':
        return bottomStyle
      case 'left':
        return leftStyle
      case 'right':
        return rightStyle
      case 'top':
        return topStyle
      default:
        return bottomStyle
    }
  }
  const style = toolStyle()
  const centerWrapStyle =
    dockPosition === 'bottom' || dockPosition === 'top'
      ? { gridRow: 1, gridColumn: 2 }
      : { gridRow: 2, gridColumn: 1 }
  const primaryToolStyle = dockPosition === 'bottom' || dockPosition === 'top' ? 'row' : 'column'

  return (
    <StyledToolsPanelContainer
      style={{
        ...style,
      }}
      onBlur={onBlur}
    >
      <StyledCenterWrap
        id="TD-Tools"
        style={{
          ...centerWrapStyle,
        }}
      >
        <BackToContent />
        <StyledPrimaryTools style={{ flexDirection: primaryToolStyle }}>
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
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',
  maxWidth: '100%',
})

const StyledPrimaryTools = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
})
