import * as React from 'react'
import { useIntl } from 'react-intl'
import { Panel } from '~components/Primitives/Panel'
import { ToolButton, ToolButtonWithTooltip } from '~components/Primitives/ToolButton'
import { UndoIcon } from '~components/Primitives/icons'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { Menu } from './Menu/Menu'
import { MultiplayerMenu } from './MultiplayerMenu'
import { PageMenu } from './PageMenu'
import { StyleMenu } from './StyleMenu'
import { ZoomMenu } from './ZoomMenu'

interface TopPanelProps {
  readOnly: boolean
  showPages: boolean
  showMenu: boolean
  showStyles: boolean
  showZoom: boolean
  showMultiplayerMenu: boolean
}

export function _TopPanel({
  readOnly,
  showPages,
  showMenu,
  showStyles,
  showZoom,
  showMultiplayerMenu,
}: TopPanelProps) {
  const app = useTldrawApp()
  const intl = useIntl()

  return (
    <StyledTopPanel>
      {(showMenu || showPages) && (
        <Panel side="left" id="TD-MenuPanel">
          {showMenu && <Menu readOnly={readOnly} />}
          {showMultiplayerMenu && <MultiplayerMenu />}
          {showPages && <PageMenu />}
        </Panel>
      )}
      <StyledSpacer />
      {(showStyles || showZoom) && (
        <Panel side="right">
          {app.readOnly ? (
            <ReadOnlyLabel>Read Only</ReadOnlyLabel>
          ) : (
            <>
              <ToolButtonWithTooltip
                kbd={'#Z'}
                label={intl.formatMessage({ id: 'undo' })}
                onClick={app.undo}
                id="TD-TopPanel-Undo"
                aria-label={intl.formatMessage({ id: 'undo' })}
              >
                <UndoIcon />
              </ToolButtonWithTooltip>
              <ToolButtonWithTooltip
                kbd={'#⇧Z'}
                label={intl.formatMessage({ id: 'redo' })}
                onClick={app.redo}
                id="TD-TopPanel-Redo"
                aria-label={intl.formatMessage({ id: 'redo' })}
              >
                <UndoIcon flipHorizontal />
              </ToolButtonWithTooltip>
            </>
          )}
          {showZoom && <ZoomMenu />}
          {showStyles && !readOnly && <StyleMenu />}
        </Panel>
      )}
    </StyledTopPanel>
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

const ReadOnlyLabel = styled('div', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '$ui',
  fontSize: '$1',
  paddingLeft: '$4',
  paddingRight: '$1',
  userSelect: 'none',
  WebkitUserSelect: 'none',
})

export const TopPanel = React.memo(_TopPanel)
