import * as React from 'react'
import { TDExport, Tldraw } from '@tldraw/tldraw'

export default function Export(): JSX.Element {
  const handleExport = React.useCallback(async (info: TDExport) => {
    // When a user exports, the default behavior is to download
    // the exported data as a file. If the onExport callback is
    // provided, it will be called instead.

    const blobUrl = URL.createObjectURL(info.blob)
    const link = document.createElement('a')
    link.href = blobUrl
    // Here we open the image in a new tab rather than downloading it.
    link.target = '_blank'
    // link.download = info.name + '.' + info.type
    link.click()
  }, [])

  return (
    <div className="tldraw">
      <Tldraw onExport={handleExport} />
    </div>
  )
}
