import * as React from 'react'
import { Tldraw } from '@tldraw/tldraw'

export default function UIOptions(): JSX.Element {
  return (
    <div className="tldraw">
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
