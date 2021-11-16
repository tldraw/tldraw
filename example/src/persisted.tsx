import * as React from 'react'
import { Tldraw } from '@tldraw/Tldraw'

export default function Persisted(): JSX.Element {
  return (
    <div className="tldraw">
      <Tldraw id="Tldraw-persisted-id" />
    </div>
  )
}
