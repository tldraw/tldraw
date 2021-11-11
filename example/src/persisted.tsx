import * as React from 'react'
import { TLDraw } from '@tldraw/tldraw'

export default function Persisted(): JSX.Element {
  return (
    <div className="tldraw">
      <TLDraw id="tldraw-persisted-id" />
    </div>
  )
}
