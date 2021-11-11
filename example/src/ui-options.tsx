import * as React from 'react'
import { TLDraw } from '@tldraw/tldraw'

export default function UIOptions(): JSX.Element {
  return (
    <div className="tldraw">
      <TLDraw
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
