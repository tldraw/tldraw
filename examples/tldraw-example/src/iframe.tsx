import * as React from 'react'

export default function IFrame() {
  return (
    <div className="tldraw">
      <iframe src="http://localhost:3000/r/hello" style={{ width: '100%', height: '50%' }} />
    </div>
  )
}
