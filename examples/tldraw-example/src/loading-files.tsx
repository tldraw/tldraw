import { TDFile, Tldraw } from '@tldraw/tldraw'
import * as React from 'react'

export default function LoadingFiles() {
  const [file, setFile] = React.useState<TDFile>()

  React.useEffect(() => {
    async function loadFile(): Promise<void> {
      const file = await fetch('Example.tldr').then((response) => response.json())
      setFile(file)
    }

    loadFile()
  }, [])

  return <Tldraw document={file?.document} />
}
