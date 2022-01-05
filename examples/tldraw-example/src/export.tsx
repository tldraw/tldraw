import * as React from 'react'
import { TDExport, Tldraw } from '@tldraw/tldraw'

export default function Export(): JSX.Element {
  const handleExport = React.useCallback(async (info: TDExport) => {
    const response = await fetch('some_serverless_endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info),
    })
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = info.name + '.' + info.type
    link.click()
  }, [])

  return (
    <div className="tldraw">
      <Tldraw onExport={handleExport} />
    </div>
  )
}
