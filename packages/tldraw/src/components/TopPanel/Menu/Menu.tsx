import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { HamburgerMenuIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { DMContent, DMItem, DMSubMenu, DMTriggerIcon } from '~components/Primitives/DropdownMenu'
import { preventEvent } from '~components/preventEvent'
import { useTldrawApp } from '~hooks'
import { useFileSystemHandlers } from '~hooks'
import { TDExportType, TDSnapshot } from '~types'
import { PreferencesMenu } from '../PreferencesMenu'

interface MenuProps {
  readOnly: boolean
}

const numberOfSelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length
}

const disableAssetsSelector = (s: TDSnapshot) => {
  return s.appState.disableAssets
}

export const Menu = React.memo(function Menu({ readOnly }: MenuProps) {
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
    app.exportImage(TDExportType.PNG, { scale: 2, quality: 1 })
  }, [app])

  const handleExportJPG = React.useCallback(async () => {
    app.exportImage(TDExportType.JPG, { scale: 2, quality: 1 })
  }, [app])

  const handleExportWEBP = React.useCallback(async () => {
    app.exportImage(TDExportType.WEBP, { scale: 2, quality: 1 })
  }, [app])

  const handleExportSVG = React.useCallback(async () => {
    app.exportImage(TDExportType.SVG, { scale: 2, quality: 1 })
  }, [app])

  const handleCopyJSON = React.useCallback(async () => {
    app.copyJson()
  }, [app])

  const handleExportJSON = React.useCallback(async () => {
    app.exportJson()
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

  const hasSelection = numberOfSelectedIds > 0

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon id="TD-MenuIcon">
        <HamburgerMenuIcon />
      </DMTriggerIcon>
      <DMContent
        variant="menu"
        id="TD-Menu"
        side="bottom"
        align="start"
        sideOffset={4}
        alignOffset={4}
      >
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
          <Divider />
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
          <Divider />
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

          <Divider />
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
          <Divider />
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
        <Divider />
        <PreferencesMenu />
      </DMContent>
    </DropdownMenu.Root>
  )
})
