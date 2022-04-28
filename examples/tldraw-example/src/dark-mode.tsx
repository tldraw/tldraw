import * as React from 'react'
import { Tldraw } from '@tldraw/tldraw'

export default function DarkMode(): JSX.Element {
  return (
    <div className="tldraw">
      <Tldraw darkMode />
    </div>
  )
}
