import * as React from 'react'
import { Tldraw, useFileSystem } from '@tldraw/Tldraw'

export default function FileSystem(): JSX.Element {
  const fileSystemEvents = useFileSystem()

  // Use the Menu > File to create, open, and save .tldr files.

  return (
    <div className="tldraw">
      <Tldraw {...fileSystemEvents} />
    </div>
  )
}
