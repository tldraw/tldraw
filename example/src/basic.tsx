import * as React from 'react'
import { TLDraw } from '@tldraw/tldraw'

export default function Basic(): JSX.Element {
  return (
    <div className="tldraw">
      <TLDraw />
    </div>
  )
}
