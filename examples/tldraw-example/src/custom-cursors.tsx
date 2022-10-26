import { CursorComponent } from '@tldraw/core'
import { TDUserStatus, Tldraw, TldrawApp } from '@tldraw/tldraw'
import * as React from 'react'

// A custom cursor component.
const CustomCursor: CursorComponent<{ name: 'Steve' }> = ({ color, metadata }) => {
  return (
    <div style={{ display: 'flex', width: 'fit-content', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 12,
          height: 12,
          background: color,
          borderRadius: '100%',
        }}
      />
      <div style={{ background: 'white', padding: '4px 8px', borderRadius: 4 }}>
        {metadata!.name}
      </div>
    </div>
  )
}

// Component overrides for the tldraw renderer
const components = {
  Cursor: CustomCursor,
}

export default function CustomCursorsExample() {
  function handleMount(app: TldrawApp) {
    // On mount, create a fake other user
    app.updateUsers([
      {
        id: 'fakeuser1',
        point: [100, 100],
        color: 'orange',
        status: TDUserStatus.Connected,
        activeShapes: [],
        selectedIds: [],
        metadata: { name: 'Steve' }, // <-- our custom metadata
      },
      {
        id: 'fakeuser2',
        point: [200, 300],
        color: 'dodgerblue',
        status: TDUserStatus.Connected,
        activeShapes: [],
        selectedIds: [],
        metadata: { name: 'Jamie' }, // <-- our custom metadata
      },
    ])
  }

  return (
    <div className="tldraw">
      <Tldraw
        components={components} // Pass in our component overrides
        onMount={handleMount}
      />
    </div>
  )
}
