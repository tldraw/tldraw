import { TLDraw } from '@tldraw/tldraw'
import * as React from 'react'

export default function Embedded(): JSX.Element {
  return (
    <div>
      <div
        style={{
          position: 'relative',
          margin: '5%',
          width: 'calc(100% - 100px)',
          height: '500px',
        }}
      >
        <TLDraw id="small1" />
      </div>

      <div
        style={{
          position: 'relative',
          margin: '5%',
          width: 'calc(100% - 100px)',
          height: '500px',
        }}
      >
        <TLDraw id="small2" />
      </div>
    </div>
  )
}
