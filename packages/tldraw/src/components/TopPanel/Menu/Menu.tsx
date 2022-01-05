import * as React from 'react'
import { ExitIcon, GitHubLogoIcon, HamburgerMenuIcon, TwitterLogoIcon } from '@radix-ui/react-icons'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { PreferencesMenu } from '../PreferencesMenu'
import {
  DMItem,
  DMContent,
  DMDivider,
  DMSubMenu,
  DMTriggerIcon,
} from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { useFileSystemHandlers } from '~hooks'
import { HeartIcon } from '~components/Primitives/icons/HeartIcon'
import { preventEvent } from '~components/preventEvent'
import { DiscordIcon } from '~components/Primitives/icons'
import { TDExportTypes, TDSnapshot } from '~types'
import { Divider } from '~components/Primitives/Divider'

interface MenuProps {
  showSponsorLink: boolean
  readOnly: boolean
}

const numberOfSelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length
}

const disableAssetsSelector = (s: TDSnapshot) => {
  return s.appState.disableAssets
}

export const Menu = React.memo(function Menu({ showSponsorLink, readOnly }: MenuProps) {
  const app = useTldrawApp()
  const numberOfSelectedIds = app.useStore(numberOfSelectedIdsSelector)
  const disableAssets = app.useStore(disableAssetsSelector)

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  const handleExportPNG = React.useCallback(async () => {
    await app.exportAllShapesAs(TDExportTypes.PNG)
  }, [app])
  const handleExportJPG = React.useCallback(async () => {
    await app.exportAllShapesAs(TDExportTypes.JPG)
  }, [app])
  const handleExportWEBP = React.useCallback(async () => {
    await app.exportAllShapesAs(TDExportTypes.WEBP)
  }, [app])

  const handleSignIn = React.useCallback(() => {
    app.callbacks.onSignIn?.(app)
  }, [app])

  const handleSignOut = React.useCallback(() => {
    app.callbacks.onSignOut?.(app)
  }, [app])

  const handleCut = React.useCallback(() => {
    app.cut()
  }, [app])

  const handleCopy = React.useCallback(() => {
    app.copy()
  }, [app])

  const handlePaste = React.useCallback(() => {
    app.paste()
  }, [app])

  const handleCopySvg = React.useCallback(() => {
    app.copySvg()
  }, [app])

  const handleCopyJson = React.useCallback(() => {
    app.copyJson()
  }, [app])

  const handleSelectAll = React.useCallback(() => {
    app.selectAll()
  }, [app])

  const handleSelectNone = React.useCallback(() => {
    app.selectNone()
  }, [app])

  const handleUploadMedia = React.useCallback(() => {
    app.openAsset()
  }, [app])

  const showFileMenu =
    app.callbacks.onNewProject ||
    app.callbacks.onOpenProject ||
    app.callbacks.onSaveProject ||
    app.callbacks.onSaveProjectAs

  const showSignInOutMenu = app.callbacks.onSignIn || app.callbacks.onSignOut || showSponsorLink

  const hasSelection = numberOfSelectedIds > 0

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon isSponsor={showSponsorLink}>
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu">
        {showFileMenu && (
          <DMSubMenu label="File...">
            {app.callbacks.onNewProject && (
              <DMItem onClick={onNewProject} kbd="#N">
                New Project
              </DMItem>
            )}
            {app.callbacks.onOpenProject && (
              <DMItem onClick={onOpenProject} kbd="#O">
                Open...
              </DMItem>
            )}
            {app.callbacks.onSaveProject && (
              <DMItem onClick={onSaveProject} kbd="#S">
                Save
              </DMItem>
            )}
            {app.callbacks.onSaveProjectAs && (
              <DMItem onClick={onSaveProjectAs} kbd="#⇧S">
                Save As...
              </DMItem>
            )}
            <Divider />
            <DMSubMenu label="Export" size="small">
              <DMItem onClick={handleExportPNG}>PNG</DMItem>
              <DMItem onClick={handleExportJPG}>JPG</DMItem>
              <DMItem onClick={handleExportWEBP}>WEBP</DMItem>
            </DMSubMenu>
            {!disableAssets && (
              <>
                <Divider />
                <DMItem onClick={handleUploadMedia} kbd="#U">
                  Upload Media
                </DMItem>
              </>
            )}
          </DMSubMenu>
        )}
        {!readOnly && (
          <>
            <DMSubMenu label="Edit...">
              <DMItem onSelect={preventEvent} onClick={app.undo} kbd="#Z">
                Undo
              </DMItem>
              <DMItem onSelect={preventEvent} onClick={app.redo} kbd="#⇧Z">
                Redo
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem onSelect={preventEvent} disabled={!hasSelection} onClick={handleCut} kbd="#X">
                Cut
              </DMItem>
              <DMItem
                onSelect={preventEvent}
                disabled={!hasSelection}
                onClick={handleCopy}
                kbd="#C"
              >
                Copy
              </DMItem>
              <DMItem onSelect={preventEvent} onClick={handlePaste} kbd="#V">
                Paste
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem
                onSelect={preventEvent}
                disabled={!hasSelection}
                onClick={handleCopySvg}
                kbd="#⇧C"
              >
                Copy as SVG
              </DMItem>
              <DMItem onSelect={preventEvent} disabled={!hasSelection} onClick={handleCopyJson}>
                Copy as JSON
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem onSelect={preventEvent} onClick={handleSelectAll} kbd="#A">
                Select All
              </DMItem>
              <DMItem onSelect={preventEvent} onClick={handleSelectNone}>
                Select None
              </DMItem>
            </DMSubMenu>
          </>
        )}
        <a href="https://tldraw.com/r">
          <DMItem>Create a Multiplayer Room</DMItem>
        </a>
        <DMDivider dir="ltr" />
        <PreferencesMenu />
        <DMDivider dir="ltr" />
        <a href="https://github.com/Tldraw/Tldraw" target="_blank" rel="nofollow">
          <DMItem>
            GitHub
            <SmallIcon>
              <GitHubLogoIcon />
            </SmallIcon>
          </DMItem>
        </a>
        <a href="https://twitter.com/Tldraw" target="_blank" rel="nofollow">
          <DMItem>
            Twitter
            <SmallIcon>
              <TwitterLogoIcon />
            </SmallIcon>
          </DMItem>
        </a>
        <a href="https://discord.gg/SBBEVCA4PG" target="_blank" rel="nofollow">
          <DMItem>
            Discord
            <SmallIcon>
              <DiscordIcon />
            </SmallIcon>
          </DMItem>
        </a>
        {showSponsorLink && (
          <a href="https://github.com/sponsors/steveruizok" target="_blank" rel="nofollow">
            <DMItem isSponsor>
              Become a Sponsor{' '}
              <SmallIcon>
                <HeartIcon />
              </SmallIcon>
            </DMItem>
          </a>
        )}
        {showSignInOutMenu && (
          <>
            <DMDivider dir="ltr" />{' '}
            {app.callbacks.onSignIn && <DMItem onSelect={handleSignIn}>Sign In</DMItem>}
            {app.callbacks.onSignOut && (
              <DMItem onSelect={handleSignOut}>
                Sign Out
                <SmallIcon>
                  <ExitIcon />
                </SmallIcon>
              </DMItem>
            )}
          </>
        )}
      </DMContent>
    </DropdownMenu.Root>
  )
})
