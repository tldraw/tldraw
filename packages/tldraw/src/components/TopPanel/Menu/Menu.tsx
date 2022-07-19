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
import { FormattedMessage, useIntl } from 'react-intl'

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
  const intl = useIntl()

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
          <DMSubMenu label={`${intl.formatMessage({ id: 'menu.file' })}...`} id="TD-MenuItem-File">
            {app.callbacks.onNewProject && (
              <DMItem onClick={onNewProject} kbd="#N" id="TD-MenuItem-File-New_Project">
                <FormattedMessage id="new.project" />
              </DMItem>
            )}
            {app.callbacks.onOpenProject && (
              <DMItem onClick={onOpenProject} kbd="#O" id="TD-MenuItem-File-Open">
                <FormattedMessage id="open" />
                ...
              </DMItem>
            )}
            {app.callbacks.onSaveProject && (
              <DMItem onClick={onSaveProject} kbd="#S" id="TD-MenuItem-File-Save">
                <FormattedMessage id="save" />
              </DMItem>
            )}
            {app.callbacks.onSaveProjectAs && (
              <DMItem onClick={onSaveProjectAs} kbd="#⇧S" id="TD-MenuItem-File-Save_As">
                <FormattedMessage id="save.as" />
                ...
              </DMItem>
            )}
            {!disableAssets && (
              <>
                <Divider />
                <DMItem onClick={handleUploadMedia} kbd="#U" id="TD-MenuItem-File-Upload_Media">
                  <FormattedMessage id="upload.media" />
                </DMItem>
              </>
            )}
          </DMSubMenu>
        )}
        <DMSubMenu label={`${intl.formatMessage({ id: 'menu.edit' })}...`} id="TD-MenuItem-Edit">
          <DMItem
            onSelect={preventEvent}
            onClick={app.undo}
            disabled={readOnly}
            kbd="#Z"
            id="TD-MenuItem-Edit-Undo"
          >
            <FormattedMessage id="undo" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.redo}
            disabled={readOnly}
            kbd="#⇧Z"
            id="TD-MenuItem-Edit-Redo"
          >
            <FormattedMessage id="redo" />
          </DMItem>
          <DMDivider dir="ltr" />
          <DMItem
            onSelect={preventEvent}
            disabled={!hasSelection || readOnly}
            onClick={handleCut}
            kbd="#X"
            id="TD-MenuItem-Edit-Cut"
          >
            <FormattedMessage id="cut" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            disabled={!hasSelection}
            onClick={handleCopy}
            kbd="#C"
            id="TD-MenuItem-Edit-Copy"
          >
            <FormattedMessage id="copy" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={handlePaste}
            kbd="#V"
            id="TD-MenuItem-Edit-Paste"
          >
            <FormattedMessage id="paste" />
          </DMItem>
          <DMDivider dir="ltr" />
          <DMSubMenu
            label={`${intl.formatMessage({ id: 'copy.as' })}...`}
            size="small"
            id="TD-MenuItem-Copy-As"
          >
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
          <DMSubMenu
            label={`${intl.formatMessage({ id: 'export.as' })}...`}
            size="small"
            id="TD-MenuItem-Export"
          >
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
            <FormattedMessage id="select.all" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            disabled={!hasSelection}
            onClick={handleSelectNone}
            id="TD-MenuItem-Select_None"
          >
            <FormattedMessage id="select.none" />
          </DMItem>
          <DMDivider dir="ltr" />
          <DMItem onSelect={handleDelete} disabled={!hasSelection} kbd="⌫" id="TD-MenuItem-Delete">
            <FormattedMessage id="delete" />
          </DMItem>
        </DMSubMenu>
        <DMSubMenu label={intl.formatMessage({ id: 'menu.view' })} id="TD-MenuItem-Edit">
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomIn}
            kbd="#+"
            id="TD-MenuItem-View-ZoomIn"
          >
            <FormattedMessage id="zoom.in" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomOut}
            kbd="#-"
            id="TD-MenuItem-View-ZoomOut"
          >
            <FormattedMessage id="zoom.out" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={handleZoomTo100}
            kbd="⇧+0"
            id="TD-MenuItem-View-ZoomTo100"
          >
            <FormattedMessage id="zoom.to" /> 100%
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomToFit}
            kbd="⇧+1"
            id="TD-MenuItem-View-ZoomToFit"
          >
            <FormattedMessage id="zoom.to.fit" />
          </DMItem>
          <DMItem
            onSelect={preventEvent}
            onClick={app.zoomToSelection}
            kbd="⇧+2"
            id="TD-MenuItem-View-ZoomToSelection"
          >
            <FormattedMessage id="zoom.to.selection" />
          </DMItem>
        </DMSubMenu>
        <DMDivider dir="ltr" />
        <PreferencesMenu />
        {showSignInOutMenu && (
          <>
            <DMDivider dir="ltr" />{' '}
            {app.callbacks.onSignIn && (
              <DMItem onSelect={handleSignIn} id="TD-MenuItem-Sign_in">
                <FormattedMessage id="menu.sign.in" />
              </DMItem>
            )}
            {app.callbacks.onSignOut && (
              <DMItem onSelect={handleSignOut} id="TD-MenuItem-Sign_out">
                <FormattedMessage id="menu.sign.out" />
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
