import * as React from 'react'
import { Menu } from './Menu/Menu'
import { styled } from '~styles'
import { PageMenu } from './PageMenu'
import { ZoomMenu } from './ZoomMenu'
import { StyleMenu } from './StyleMenu'
import { Panel } from '~components/Primitives/Panel'
import { ToolButton, ToolButtonWithTooltip } from '~components/Primitives/ToolButton'
import { RedoIcon, UndoIcon } from '~components/Primitives/icons'
import { breakpoints } from '~components/breakpoints'
import { useTldrawApp } from '~hooks'
import { MultiplayerMenu } from './MultiplayerMenu'
import { DoubleArrowLeftIcon, DoubleArrowRightIcon, PlayIcon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Primitives/Tooltip'

interface TopPanelProps {
  readOnly: boolean
  showPages: boolean
  showMenu: boolean
  showStyles: boolean
  showZoom: boolean
  showMultiplayerMenu: boolean
  showSponsorLink: boolean
}

export function TopPanel({
  readOnly,
  showPages,
  showMenu,
  showStyles,
  showZoom,
  showSponsorLink,
  showMultiplayerMenu,
}: TopPanelProps) {
  const app = useTldrawApp()

  const toggleDeckVisibility = React.useCallback(() => {
    app.setSetting('showDeck', (v) => !v)
  }, [app])

  return (
    <StyledTopPanel>
      {(showMenu || showPages) && (
        <Panel side="left" id="TD-MenuPanel">
          {showMenu && <Menu showSponsorLink={showSponsorLink} readOnly={readOnly} />}
          {/* {showMultiplayerMenu && <MultiplayerMenu />} */}
          <TopPanelToolButton label="Undo" onClick={app.undo}>
            <UndoIcon />
          </TopPanelToolButton>
          <TopPanelToolButton label="Redo" onClick={app.redo}>
            <RedoIcon />
          </TopPanelToolButton>
          {showStyles && !readOnly && <StyleMenu />}
          {showZoom && <ZoomMenu />}
        </Panel>
      )}
      <StyledSpacer />
      {(showStyles || showZoom) && (
        <Panel side="right">
          <Tooltip label="Start presentation mode" kbd="#⇧P">
            <ToolButton variant="text" onClick={app.togglePresentationMode}>
              <PlayIcon /> Present
            </ToolButton>
          </Tooltip>
          {showPages && <PageMenu />}
          <TopPanelToolButton label="Toggle deck" onClick={toggleDeckVisibility}>
            {app.settings.showDeck ? <DoubleArrowRightIcon /> : <DoubleArrowLeftIcon />}
          </TopPanelToolButton>
        </Panel>
      )}
    </StyledTopPanel>
  )
}

function TopPanelToolButton({
  label,
  kbd,
  onClick,
  children,
}: {
  label: string
  kbd?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label} kbd={kbd}>
      <ToolButton onClick={onClick}>{children}</ToolButton>
    </Tooltip>
  )
}

const StyledTopPanel = styled('div', {
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'row',
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'all',
  },
})

const StyledSpacer = styled('div', {
  flexGrow: 2,
  pointerEvents: 'none',
})

const MobileOnly = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  variants: {
    bp: {
      small: {
        display: 'inherit',
      },
      large: {
        display: 'none',
      },
    },
  },
})
