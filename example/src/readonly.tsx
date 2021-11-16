import { Tldraw, TldrawFile } from '@tldraw/Tldraw'
import * as React from 'react'

export default function ReadOnly(): JSX.Element {
  const [file, setFile] = React.useState<TldrawFile>()

  React.useEffect(() => {
    async function loadFile(): Promise<void> {
      const file = await fetch('Example.tldr').then((response) => response.json())
      setFile(file)
    }

    loadFile()
  }, [])

  return (
    <div className="Tldraw">
      <Tldraw readOnly document={file?.document} />
    </div>
  )
}
