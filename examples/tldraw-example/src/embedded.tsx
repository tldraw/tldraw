import { Tldraw } from '@tldraw/tldraw'
import * as React from 'react'

export default function Embedded() {
  return (
    <div style={{ padding: '2% 10%', width: 'calc(100% - 100px)' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '500px',
          overflow: 'hidden',
          marginBottom: '32px',
        }}
      >
        <Tldraw id="small5" />
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '500px',
          overflow: 'hidden',
        }}
      >
        <Tldraw id="embedded" />
      </div>
    </div>
  )
}
