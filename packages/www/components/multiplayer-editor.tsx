import { TLDraw, TLDrawState, Data, TLDrawDocument } from '@tldraw/tldraw'
import * as gtag from '-utils/gtag'
import React from 'react'
import { createClient } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useObject } from '@liveblocks/react'

const client = createClient({
  publicApiKey: 'pk_live_1LJGGaqBSNLjLT-4Jalkl-U9',
})

export default function MultiplayerEditor({ id }: { id: string }) {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={id}>
        <Editor />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function Editor() {
  const doc = useObject<TLDrawDocument>('doc', {
    id: 'doc',
    pages: {
      page1: {
        id: 'page1',
        shapes: {},
        bindings: {},
      },
    },
    pageStates: {
      page1: {
        id: 'page1',
        selectedIds: ['rect1'],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    },
  })

  // Put the tlstate into the window, for debugging.
  const handleMount = React.useCallback((tlstate: TLDrawState) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = tlstate
  }, [])

  // Send events to gtag as actions.
  const handleChange = React.useCallback(
    (_tlstate: TLDrawState, state: Data, reason: string) => {
      if (reason.startsWith('command')) {
        gtag.event({
          action: reason,
          category: 'editor',
          label: '',
          value: 0,
        })
        if (doc) {
          doc.update(state.document)
        }
      }
    },
    [doc]
  )

  if (doc === null) return <div>loading...</div>

  return (
    <div className="tldraw">
      <TLDraw document={doc.toObject()} onMount={handleMount} onChange={handleChange} autofocus />
    </div>
  )
}
