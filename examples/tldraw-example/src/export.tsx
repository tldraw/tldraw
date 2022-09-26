import { TDExport, TDExportType, Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'

const ACTION = 'download' as 'download' | 'open'

export default function Export() {
  const handleExport = React.useCallback(async (app: TldrawApp, info: TDExport) => {
    // When a user exports, the default behavior is to download
    // the exported data as a file. If the onExport callback is
    // provided, it will be called instead.

    switch (ACTION) {
      case 'download': {
        // Download the file
        const blobUrl = URL.createObjectURL(info.blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = info.name + '.' + info.type
        link.click()
        break
      }
      case 'open': {
        // Open the file in a new tab
        const blobUrl = URL.createObjectURL(info.blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.target = '_blank'
        link.click()
        break
      }
    }
  }, [])

  const [app, setApp] = React.useState<TldrawApp>()

  const handleExportSVG = React.useCallback(() => {
    app?.exportImage(TDExportType.SVG, { scale: 1, quality: 1 })
  }, [app])

  const handleExportPNG = React.useCallback(() => {
    app?.exportImage(TDExportType.PNG, { scale: 2, quality: 1 })
  }, [app])

  const handleExportJPG = React.useCallback(() => {
    app?.exportImage(TDExportType.JPG, { scale: 2, quality: 1 })
  }, [app])

  const handleMount = React.useCallback((app: TldrawApp) => {
    setApp(app)
  }, [])

  return (
    <div className="tldraw">
      <Tldraw id="export_example" onMount={handleMount} onExport={handleExport} />
      <div style={{ position: 'fixed', top: 128, left: 32, zIndex: 100 }}>
        <button onClick={handleExportPNG}>Export as PNG</button>
        <button onClick={handleExportSVG}>Export as SVG</button>
        <button onClick={handleExportJPG}>Export as JPG</button>
      </div>
    </div>
  )
}
