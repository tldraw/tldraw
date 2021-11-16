import * as React from 'react'
import { Tldraw } from '@tldraw/Tldraw'

export default function UIOptions(): JSX.Element {
  return (
    <div className="Tldraw">
      <Tldraw
        showUI={true}
        showMenu={true}
        showPages={true}
        showStyles={true}
        showTools={true}
        showZoom={true}
      />
    </div>
  )
}
