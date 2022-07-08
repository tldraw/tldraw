import * as React from 'react'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { useTldrawApp } from '~hooks'
import { StatusBar } from './StatusBar'
import { BackToContent } from './BackToContent'
import { PrimaryTools } from './PrimaryTools'
import { ActionButton } from './ActionButton'
import { DeleteButton } from './DeleteButton'
import { breakpoints } from '~components/breakpoints'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

interface ToolsPanelProps {
  onBlur?: React.FocusEventHandler
}

export const ToolsPanel = React.memo(function ToolsPanel({ onBlur }: ToolsPanelProps) {
  const app = useTldrawApp()
  const isDebugMode = app.useStore(isDebugModeSelector)
  const dockPosition = app.useStore(dockPositionState)

  const orientation =
    dockPosition === 'bottom' || dockPosition === 'top' ? 'horizontal' : 'vertical'

  return (
    <StyledToolsPanelContainer
      side={dockPosition}
      onBlur={onBlur}
      bp={breakpoints}
      debug={isDebugMode}
    >
      <StyledCenterWrap id="TD-Tools" orientation={orientation}>
        <BackToContent />
        <StyledPrimaryTools orientation={orientation}>
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
  variants: {
    debug: {
      true: {},
      false: {},
    },
    bp: {
      mobile: {},
      small: {},
      medium: {},
      large: {},
    },
    side: {
      top: {
        width: '100%',
        height: 'min-content',
        left: 0,
        right: 0,
        top: 60,
      },
      right: { width: 'min-content', height: '100%', right: 0 },
      bottom: {
        width: '100%',
        height: 'min-content',
        left: 0,
        right: 0,
        bottom: 0,
      },
      left: { width: 'min-content', height: '100%', left: 10 },
    },
  },
  compoundVariants: [
    {
      side: 'top',
      bp: 'large',
      css: {
        top: 10,
      },
    },
    {
      side: 'bottom',
      debug: true,
      css: {
        bottom: 40,
      },
    },
  ],
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
  variants: {
    orientation: {
      horizontal: { gridRow: 1, gridColumn: 2 },
      vertical: { gridRow: 2, gridColumn: 1 },
    },
  },
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
  variants: {
    orientation: {
      horizontal: {
        flexDirection: 'row',
      },
      vertical: {
        flexDirection: 'column',
      },
    },
  },
})
