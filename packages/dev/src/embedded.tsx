import { TLDraw } from '@tldraw/tldraw'
import * as React from 'react'

export default function Embedded(): JSX.Element {
  return (
    <div style={{ padding: '2% 10%', width: 'calc(100% - 100px)' }}>
      <div
        style={{
          position: 'relative',
          width: 'auto',
          height: '500px',
          overflow: 'hidden',
          marginBottom: '32px',
        }}
      >
        <TLDraw id="small3" />
      </div>

      <div
        style={{
          position: 'relative',
          width: 'auto',
          height: '500px',
          overflow: 'hidden',
        }}
      >
        <TLDraw id="small4" />
      </div>
    </div>
  )
}
