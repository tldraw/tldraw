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

  const [_, setForce] = React.useState(0)

  React.useEffect(() => setForce(1), [])

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

  const handleExportPDF = React.useCallback(async () => {
    await app.exportAllShapesAs(TDExportTypes.PDF)
  }, [app])

  const handleExportSVG = React.useCallback(async () => {
    await app.exportAllShapesAs(TDExportTypes.SVG)
  }, [app])

  const handleExportJSON = React.useCallback(async () => {
    await app.exportAllShapesAs(TDExportTypes.JSON)
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

  const handleZoomTo100 = React.useCallback(() => {
    app.zoomTo(1)
  }, [app])

  const showFileMenu =
    app.callbacks.onNewProject ||
    app.callbacks.onOpenProject ||
    app.callbacks.onSaveProject ||
    app.callbacks.onSaveProjectAs ||
    app.callbacks.onExport

  const showSignInOutMenu = app.callbacks.onSignIn || app.callbacks.onSignOut || showSponsorLink

  const hasSelection = numberOfSelectedIds > 0

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon isSponsor={showSponsorLink} id="TD-MenuIcon">
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent variant="menu" id="TD-Menu">
        {showFileMenu && (
          <DMSubMenu label="File..." id="TD-MenuItem-File">
            {app.callbacks.onNewProject && (
              <DMItem onClick={onNewProject} kbd="#N" id="TD-MenuItem-File-New_Project">
                New Project
              </DMItem>
            )}
            {app.callbacks.onOpenProject && (
              <DMItem onClick={onOpenProject} kbd="#O" id="TD-MenuItem-File-Open">
                Open...
              </DMItem>
            )}
            {app.callbacks.onSaveProject && (
              <DMItem onClick={onSaveProject} kbd="#S" id="TD-MenuItem-File-Save">
                Save
              </DMItem>
            )}
            {app.callbacks.onSaveProjectAs && (
              <DMItem onClick={onSaveProjectAs} kbd="#⇧S" id="TD-MenuItem-File-Save_As">
                Save As...
              </DMItem>
            )}
            {app.callbacks.onExport && (
              <>
                <Divider />
                <DMSubMenu label="Export" size="small" id="TD-MenuItem-File-Export">
                  <DMItem onClick={handleExportPNG} id="TD-MenuItem-File-Export-PNG">
                    PNG
                  </DMItem>
                  <DMItem onClick={handleExportJPG} id="TD-MenuItem-File-Export-JPG">
                    JPG
                  </DMItem>
                  <DMItem onClick={handleExportWEBP} id="TD-MenuItem-File-Export-WEBP">
                    WEBP
                  </DMItem>
                  <DMItem onClick={handleExportSVG} id="TD-MenuItem-File-Export-SVG">
                    SVG
                  </DMItem>
                  <DMItem onClick={handleExportJSON} id="TD-MenuItem-File-Export-JSON">
                    JSON
                  </DMItem>
                </DMSubMenu>
              </>
            )}
            {!disableAssets && (
              <>
                <Divider />
                <DMItem onClick={handleUploadMedia} kbd="#U" id="TD-MenuItem-File-Upload_Media">
                  Upload Media
                </DMItem>
              </>
            )}
          </DMSubMenu>
        )}
        {!readOnly && (
          <>
            <DMSubMenu label="Edit..." id="TD-MenuItem-Edit">
              <DMItem
                onSelect={preventEvent}
                onClick={app.undo}
                kbd="#Z"
                id="TD-MenuItem-Edit-Undo"
              >
                Undo
              </DMItem>
              <DMItem
                onSelect={preventEvent}
                onClick={app.redo}
                kbd="#⇧Z"
                id="TD-MenuItem-Edit-Redo"
              >
                Redo
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem
                onSelect={preventEvent}
                disabled={!hasSelection}
                onClick={handleCut}
                kbd="#X"
                id="TD-MenuItem-Edit-Cut"
              >
                Cut
              </DMItem>
              <DMItem
                onSelect={preventEvent}
                disabled={!hasSelection}
                onClick={handleCopy}
                kbd="#C"
                id="TD-MenuItem-Edit-Copy"
              >
                Copy
              </DMItem>
              <DMItem
                onSelect={preventEvent}
                onClick={handlePaste}
                kbd="#V"
                id="TD-MenuItem-Edit-Paste"
              >
                Paste
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem
                onSelect={preventEvent}
                disabled={!hasSelection}
                onClick={handleCopySvg}
                kbd="#⇧C"
                id="TD-MenuItem-Edit-Copy_as_SVG"
              >
                Copy as SVG
              </DMItem>
              <DMItem
                onSelect={preventEvent}
                disabled={!hasSelection}
                onClick={handleCopyJson}
                id="TD-MenuItem-Edit-Copy_as_JSON"
              >
                Copy as JSON
              </DMItem>
              <DMDivider dir="ltr" />
              <DMItem
                onSelect={preventEvent}
                onClick={handleSelectAll}
                kbd="#A"
                id="TD-MenuItem-Select_All"
              >
                Select All
              </DMItem>
              <DMItem
                onSelect={preventEvent}
                onClick={handleSelectNone}
                id="TD-MenuItem-Select_None"
              >
                Select None
              </DMItem>
            </DMSubMenu>
          </>
        )}
        <DMSubMenu label="View" id="TD-MenuItem-Edit">
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomIn}
            kbd="#+"
            id="TD-MenuItem-View-ZoomIn"
          >
            Zoom In
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomOut}
            kbd="#-"
            id="TD-MenuItem-View-ZoomOut"
          >
            Zoom Out
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={handleZoomTo100}
            kbd="⇧+0"
            id="TD-MenuItem-View-ZoomTo100"
          >
            Zoom to 100%
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomToFit}
            kbd="⇧+1"
            id="TD-MenuItem-View-ZoomToFit"
          >
            Zoom to Fit
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomToSelection}
            kbd="⇧+2"
            id="TD-MenuItem-View-ZoomToSelection"
          >
            Zoom to Selection
          </DMItem>
        </DMSubMenu>
        <DMDivider dir="ltr" />
        <PreferencesMenu />
        <DMDivider dir="ltr" />
        <a href="https://github.com/Tldraw/Tldraw" target="_blank" rel="nofollow">
          <DMItem id="TD-MenuItem-Github">
            GitHub
            <SmallIcon>
              <GitHubLogoIcon />
            </SmallIcon>
          </DMItem>
        </a>
        <a href="https://twitter.com/Tldraw" target="_blank" rel="nofollow">
          <DMItem id="TD-MenuItem-Twitter">
            Twitter
            <SmallIcon>
              <TwitterLogoIcon />
            </SmallIcon>
          </DMItem>
        </a>
        <a href="https://discord.gg/SBBEVCA4PG" target="_blank" rel="nofollow">
          <DMItem id="TD-MenuItem-Discord">
            Discord
            <SmallIcon>
              <DiscordIcon />
            </SmallIcon>
          </DMItem>
        </a>
        {showSponsorLink && (
          <a href="https://github.com/sponsors/steveruizok" target="_blank" rel="nofollow">
            <DMItem isSponsor id="TD-MenuItem-Become_a_Sponsor">
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
            {app.callbacks.onSignIn && (
              <DMItem onSelect={handleSignIn} id="TD-MenuItem-Sign_in">
                Sign In
              </DMItem>
            )}
            {app.callbacks.onSignOut && (
              <DMItem onSelect={handleSignOut} id="TD-MenuItem-Sign_out">
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
