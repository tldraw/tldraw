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
  const side = app.useStore(dockPositionState)
  const isDebugMode = app.useStore(isDebugModeSelector)

  return (
    <>
      <StyledToolsPanelContainer side={side} onBlur={onBlur} bp={breakpoints} debug={isDebugMode}>
        <StyledCenterWrap id="TD-Tools">
          <BackToContent />
          <StyledPrimaryTools
            orientation={side === 'bottom' || side === 'top' ? 'horizontal' : 'vertical'}
          >
            <ActionButton />
            <PrimaryTools />
            <DeleteButton />
          </StyledPrimaryTools>
        </StyledCenterWrap>
      </StyledToolsPanelContainer>
      {isDebugMode && (
        <StyledStatusWrap>
          <StatusBar />
        </StyledStatusWrap>
      )}
    </>
  )
})

const StyledToolsPanelContainer = styled('div', {
  position: 'absolute',
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  height: '64px',
  gap: '$4',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 200,
  overflow: 'hidden',
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
        height: 64,
        left: 0,
        right: 0,
        top: 45,
      },
      right: { width: 64, height: '100%', top: 0, right: 0 },
      bottom: {
        width: '100%',
        left: 0,
        right: 0,
        bottom: 0,
      },
      left: { width: 64, height: '100%', left: 0 },
    },
  },
  compoundVariants: [
    {
      side: 'top',
      bp: 'large',
      css: {
        top: '10px',
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
  display: 'flex',
  width: 'fit-content',
  height: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: '$4',
})

const StyledStatusWrap = styled('div', {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '40px',
  width: '100%',
  maxWidth: '100%',
})

const StyledPrimaryTools = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  height: 'fit-content',
  gap: '$3',
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
