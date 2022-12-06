import { DesktopIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { Panel } from '~components/Primitives/Panel'
import { ToolButton } from '~components/Primitives/ToolButton'
import { UndoIcon } from '~components/Primitives/icons'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { Menu } from './Menu/Menu'
import { PageMenu } from './PageMenu'
import { StyleMenu } from './StyleMenu'
import { ZoomMenu } from './ZoomMenu'
import {stopPropagation} from "~components/stopPropagation";
import {InboxMenu} from "~components/SVBTopPanel/InboxMenu/InboxMenu";

interface SVBTopPanelProps {
  readOnly: boolean
  showPages: boolean
  showInbox: boolean
  showMenu: boolean
  showStyles: boolean
  showZoom: boolean
}

export function _SVBTopPanel({
  readOnly,
  showPages,
  showInbox,
  showMenu,
  showStyles,
  showZoom,
}: SVBTopPanelProps) {
  const app = useTldrawApp()

  return (
    <StyledSVBTopPanel>
      {(showMenu || showPages) && (
        <Panel side="left" id="TD-MenuPanel">
          {showMenu && <Menu readOnly={readOnly} />}
          {showInbox && <InboxMenu />}
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
              <ToolButton>
                <UndoIcon onClick={app.undo} />
              </ToolButton>
              <ToolButton>
                <UndoIcon onClick={app.redo} flipHorizontal />
              </ToolButton>
              <ToolButton>
                <DesktopIcon onClick={app.togglePresentationMode} onPointerDown={stopPropagation}/>
              </ToolButton>
            </>
          )}
          {showZoom && <ZoomMenu />}
          {showStyles && !readOnly && <StyleMenu />}
        </Panel>
      )}
    </StyledSVBTopPanel>
  )
}

const StyledSVBTopPanel = styled('div', {
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
})

export const SVBTopPanel = React.memo(_SVBTopPanel)
