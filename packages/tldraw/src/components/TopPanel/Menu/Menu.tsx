import * as React from 'react'
import {
  ExitIcon,
  GitHubLogoIcon,
  HamburgerMenuIcon,
  HeartFilledIcon,
  TwitterLogoIcon,
} from '@radix-ui/react-icons'
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
import { TDExportType, TDSnapshot } from '~types'
import { Divider } from '~components/Primitives/Divider'

interface MenuProps {
  sponsor: boolean | undefined
  readOnly: boolean
}

const numberOfSelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length
}

const disableAssetsSelector = (s: TDSnapshot) => {
  return s.appState.disableAssets
}

export const Menu = React.memo(function Menu({ sponsor, readOnly }: MenuProps) {
  const app = useTldrawApp()

  const numberOfSelectedIds = app.useStore(numberOfSelectedIdsSelector)

  const disableAssets = app.useStore(disableAssetsSelector)

  const [_, setForce] = React.useState(0)

  React.useEffect(() => setForce(1), [])

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  const handleCopySVG = React.useCallback(() => {
    app.copyImage(TDExportType.SVG, { scale: 1, quality: 1, transparentBackground: false })
  }, [app])

  const handleCopyPNG = React.useCallback(() => {
    app.copyImage(TDExportType.PNG, { scale: 2, quality: 1, transparentBackground: true })
  }, [app])

  const handleExportPNG = React.useCallback(async () => {
    app.exportImage(TDExportType.PNG, { scale: 2, quality: 1, transparentBackground: true })
  }, [app])

  const handleExportJPG = React.useCallback(async () => {
    app.exportImage(TDExportType.JPG, { scale: 2, quality: 1, transparentBackground: false })
  }, [app])

  const handleExportWEBP = React.useCallback(async () => {
    app.exportImage(TDExportType.WEBP, { scale: 2, quality: 1, transparentBackground: false })
  }, [app])

  const handleExportSVG = React.useCallback(async () => {
    app.exportImage(TDExportType.SVG, { scale: 2, quality: 1, transparentBackground: false })
  }, [app])

  const handleCopyJSON = React.useCallback(async () => {
    app.copyJson()
  }, [app])

  const handleExportJSON = React.useCallback(async () => {
    app.exportJson()
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

  const showSignInOutMenu = app.callbacks.onSignIn || app.callbacks.onSignOut

  const hasSelection = numberOfSelectedIds > 0

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon id="TD-MenuIcon">
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
        <DMSubMenu label="Edit..." id="TD-MenuItem-Edit">
          <DMItem
            onSelect={preventEvent}
            onClick={app.undo}
            disabled={readOnly}
            kbd="#Z"
            id="TD-MenuItem-Edit-Undo"
          >
            Undo
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.redo}
            disabled={readOnly}
            kbd="#⇧Z"
            id="TD-MenuItem-Edit-Redo"
          >
            Redo
          </DMItem>
          <DMDivider dir="ltr" />
          <DMItem
            onSelect={preventEvent}
            disabled={!hasSelection || readOnly}
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
          <DMSubMenu label="Copy as..." size="small" id="TD-MenuItem-Copy-As">
            <DMItem onClick={handleCopySVG} id="TD-MenuItem-Copy-as-SVG">
              SVG
            </DMItem>
            <DMItem onClick={handleCopyPNG} id="TD-MenuItem-Copy-As-PNG">
              PNG
            </DMItem>
            <DMItem onClick={handleCopyJSON} id="TD-MenuItem-Copy_as_JSON">
              JSON
            </DMItem>
          </DMSubMenu>
          <DMSubMenu label="Export as..." size="small" id="TD-MenuItem-Export">
            <DMItem onClick={handleExportSVG} id="TD-MenuItem-Export-SVG">
              SVG
            </DMItem>
            <DMItem onClick={handleExportPNG} id="TD-MenuItem-Export-PNG">
              PNG
            </DMItem>
            <DMItem onClick={handleExportJPG} id="TD-MenuItem-Export-JPG">
              JPG
            </DMItem>
            <DMItem onClick={handleExportWEBP} id="TD-MenuItem-Export-WEBP">
              WEBP
            </DMItem>
            <DMItem onClick={handleExportJSON} id="TD-MenuItem-Export-JSON">
              JSON
            </DMItem>
          </DMSubMenu>

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
            disabled={!hasSelection}
            onClick={handleSelectNone}
            id="TD-MenuItem-Select_None"
          >
            Select None
          </DMItem>
          <DMDivider dir="ltr" />
          <DMItem onSelect={handleDelete} disabled={!hasSelection} kbd="⌫" id="TD-MenuItem-Delete">
            Delete
          </DMItem>
        </DMSubMenu>
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
        {sponsor === false && (
          <a href="https://github.com/sponsors/steveruizok" target="_blank" rel="nofollow">
            <DMItem isSponsor id="TD-MenuItem-Become_a_Sponsor">
              Become a Sponsor{' '}
              <SmallIcon>
                <HeartIcon />
              </SmallIcon>
            </DMItem>
          </a>
        )}
        {sponsor === true && (
          <a href="https://github.com/sponsors/steveruizok" target="_blank" rel="nofollow">
            <DMItem id="TD-MenuItem-is_a_Sponsor">
              Sponsored!
              <SmallIcon>
                <HeartFilledIcon />
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
