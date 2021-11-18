import * as React from 'react'
import { Tldraw } from '@tldraw/tldraw'

export default function Basic(): JSX.Element {
  return (
    <div className="tldraw">
      <Tldraw />
    </div>
  )
}
