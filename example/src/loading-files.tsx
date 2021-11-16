import { Tldraw, TldrawFile } from '@tldraw/Tldraw'
import * as React from 'react'

export default function LoadingFiles(): JSX.Element {
  const [file, setFile] = React.useState<TldrawFile>()

  React.useEffect(() => {
    async function loadFile(): Promise<void> {
      const file = await fetch('Example.tldr').then((response) => response.json())
      setFile(file)
    }

    loadFile()
  }, [])

  return <Tldraw document={file?.document} />
}
