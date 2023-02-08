import * as React from 'react'
import { Panel } from '~components/Primitives/Panel'
import { breakpoints } from '~components/breakpoints'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { ActionButton } from './ActionButton'
import { BackToContent } from './BackToContent'
import { PrimaryTools } from './PrimaryTools'
import { SecondaryTools } from './SecondaryTools'
import { StatusBar } from './StatusBar'

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
            {/*<StyleActionButton>
              <ActionButton />
  </StyleActionButton>*/}
            <StyledToolsBar
              orientation={side === 'bottom' || side === 'top' ? 'horizontal' : 'vertical'}
            >
              <PrimaryTools />
              <StyleLine side={side === 'bottom' || side === 'top' ? 'horizontal' : 'vertical'} />
              <SecondaryTools />
            </StyledToolsBar>
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
  height: 116,
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
        height: 116,
        left: 0,
        right: 0,
        top: 45,
      },
      right: { width: 116, height: '100%', top: 0, right: 0 },
      bottom: {
        width: '100%',
        left: 0,
        right: 0,
        bottom: 4,
      },
      left: { width: 116, height: '100%', left: 0 },
    },
  },
  compoundVariants: [
    {
      side: 'top',
      bp: 'large',
      css: {
        top: 0,
      },
    },
    {
      side: 'bottom',
      debug: true,
      css: {
        bottom: 44,
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
  bottom: '0px',
  left: '0px',
  right: '0px',
  height: '40px',
  width: '100%',
  maxWidth: '100%',
})

const StyleLine = styled('div', {
  display: 'flex',
  backgroundColor: '#ddd',
  variants: {
    side: {
      horizontal: {
        width: 1,
        height: 28,
      },
      vertical: {
        width: '100%',
        height: 1,
      },
    },
  },
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

const StyleActionButton = styled('div', {
  backgroundColor: '$panel',
  display: 'flex',
  flexDirection: 'row',
  boxShadow: '$panel',
  padding: '$3',
  border: '1px solid $panelContrast',
  borderRadius: 6,
})

const StyledToolsBar = styled(Panel, {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  height: 'fit-content',
  gap: '$3',
  borderRadius: 6,
  variants: {
    orientation: {
      horizontal: {
        flexDirection: 'row',
        padding: '$3 $4',
      },
      vertical: {
        flexDirection: 'column',
        padding: '$4 $3',
      },
    },
  },
  // button: {
  //   width: 28,
  //   height: 28,
  //   [`svg`]: {
  //     width: 12,
  //     height: 12,
  //   },
  // },
})
