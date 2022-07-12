import * as React from 'react'

export default function IFrame() {
  return (
    <div className="tldraw" style={{ padding: 32 }}>
      <iframe
        src="http://localhost:3000/r/hello"
        style={{ width: '100%', height: '50%', border: 'none' }}
      />
    </div>
  )
}
