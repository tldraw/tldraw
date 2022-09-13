import * as React from 'react'
import { useIntl } from 'react-intl'
import { DMItem, DMSubMenu } from '~components/Primitives/DropdownMenu'
import { useTldrawApp } from '~hooks'
import { TDExportType } from '~types'
import { ExportPagesDialog } from './ExportPagesDialog'

export function ExportMenu() {
  const intl = useIntl()
  const app = useTldrawApp()

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

  const handleExportJSON = React.useCallback(async () => {
    app.exportJson()
  }, [app])

  return (
    <DMSubMenu label={`${intl.formatMessage({ id: 'export' })}`} id="TL-ExportMenu">
      <DMSubMenu
        label={app.page.name + ' ' + intl.formatMessage({ id: 'as' })}
        id="TD-MenuItem-Export-SVG"
      >
        <DMItem onClick={handleExportSVG} id="TD-MenuItem-Export-PNG">
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
      <ExportPagesDialog />
    </DMSubMenu>
  )
}
