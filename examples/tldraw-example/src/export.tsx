import * as React from 'react'
import { TldrawApp, TDExport, Tldraw } from '@tldraw/tldraw'

const ACTION = 'download' as 'download' | 'open'

export default function Export(): JSX.Element {
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

  return (
    <div className="tldraw">
      <Tldraw onExport={handleExport} />
    </div>
  )
}
