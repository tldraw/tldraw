import { Tldraw, useFileSystem } from '@tldraw/tldraw'
import * as React from 'react'

export default function FileSystem() {
  const fileSystemEvents = useFileSystem()

  // Use the Menu > File to create, open, and save .tldr files.

  return (
    <div className="tldraw">
      <Tldraw {...fileSystemEvents} />
    </div>
  )
}
