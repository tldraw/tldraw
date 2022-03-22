import { Tldraw, TDFile } from '@tlslides/tldraw'
import * as React from 'react'

export default function ReadOnly(): JSX.Element {
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
