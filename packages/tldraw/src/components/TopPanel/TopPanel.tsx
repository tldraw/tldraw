import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ClipboardIcon } from '@radix-ui/react-icons'
import JSONCrush from 'jsoncrush'
import * as React from 'react'
import { FormattedMessage } from 'react-intl'
import { DMContent, DMItem } from '~components/Primitives/DropdownMenu'
import { Panel } from '~components/Primitives/Panel'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { ToolButton } from '~components/Primitives/ToolButton'
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

export function TopPanel({
  readOnly,
  showPages,
  showMenu,
  showStyles,
  showZoom,
  showMultiplayerMenu,
}: TopPanelProps) {
  const app = useTldrawApp()

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
          <ShareMenu />
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
})

const ShareButton = styled(DropdownMenu.Trigger, {
  all: 'unset',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$2',
  padding: '0 15px',
  fontSize: '$1',
  lineHeight: 1,
  fontWeight: 'normal',
  height: 36,
  cursor: 'pointer',
  minWidth: 48,
  backgroundColor: '#2F80ED',
  color: 'White',
  marginTop: 2,
})

const ShareMenu = () => {
  const app = useTldrawApp()
  const currentPageId = app.appState.currentPageId
  const pageDocument = app.document.pages[currentPageId]
  const pageState = app.document.pageStates[currentPageId]

  const copyCurrentPageLink = () => {
    const hasAsset = Object.entries(pageDocument.shapes).filter(
      ([_, value]) => value.assetId
    ).length
    if (hasAsset) {
      alert('too big to fit in an url')
    } else {
      try {
        const state = {
          page: {
            ...pageDocument,
          },
          pageState: {
            ...pageState,
          },
        }
        const crushed = JSONCrush.crush(JSON.stringify(state))
        const link = `${window.location.href}/?d=${encodeURIComponent(crushed)}`
        navigator.clipboard.writeText(link)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const copyProjectLink = () => {
    if (Object.keys(app.document.assets).length) {
      alert('too big to fit in an url')
    } else {
      try {
        const crushed = JSONCrush.crush(JSON.stringify(app.document))
        const link = `${window.location.href}/?d=${encodeURIComponent(crushed)}`
        navigator.clipboard.writeText(link)
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <DropdownMenu.Root dir="ltr">
      <ShareButton id="TD-MultiplayerMenuIcon">
        <FormattedMessage id="share" />
      </ShareButton>
      <DMContent variant="menu" id="TD-MultiplayerMenu" side="bottom" align="start" sideOffset={4}>
        <DMItem id="TD-Multiplayer-CopyInviteLink" onClick={copyCurrentPageLink}>
          <FormattedMessage id="copy.current.page.link" />
          <SmallIcon>
            <ClipboardIcon />
          </SmallIcon>
        </DMItem>
        <DMItem id="TD-Multiplayer-CopyReadOnlyLink" onClick={copyProjectLink}>
          <FormattedMessage id="copy.project.link" />
          <SmallIcon>
            <ClipboardIcon />
          </SmallIcon>
        </DMItem>
      </DMContent>
    </DropdownMenu.Root>
  )
}
