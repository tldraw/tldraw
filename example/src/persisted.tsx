import * as React from 'react'
import { Tldraw } from '@tldraw/Tldraw'

export default function Persisted(): JSX.Element {
  return (
    <div className="Tldraw">
      <Tldraw id="Tldraw-persisted-id" />
    </div>
  )
}
