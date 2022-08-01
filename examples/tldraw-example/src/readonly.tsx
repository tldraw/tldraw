import { TDFile, Tldraw } from '@tldraw/tldraw'
import * as React from 'react'

export default function ReadOnly() {
  const [file, setFile] = React.useState<TDFile>()

  React.useEffect(() => {
    async function loadFile(): Promise<void> {
      const file = await fetch('Example.tldr').then((response) => response.json())
      setFile(file)
    }

    loadFile()
  }, [])

  return (
    <div className="tldraw">
      <Tldraw readOnly document={file?.document} />
    </div>
  )
}
