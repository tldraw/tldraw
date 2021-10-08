import * as React from 'react'
import {
  TLDraw,
  ColorStyle,
  TLDrawPage,
  DashStyle,
  TLDrawState,
  SizeStyle,
  TLDrawDocument,
  TLDrawShapeType,
} from '@tldraw/tldraw'
import { createClient } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useObject } from '@liveblocks/react'

const client = createClient({
  publicApiKey: 'pk_live_1LJGGaqBSNLjLT-4Jalkl-U9',
})

export default function LiveBlocks() {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id="room1">
        <TLDrawWrapper />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function TLDrawWrapper() {
  const doc = useObject<TLDrawDocument>('doc', {
    id: 'doc',
    pages: {
      page1: {
        id: 'page1',
        shapes: {
          rect1: {
            id: 'rect1',
            type: TLDrawShapeType.Rectangle,
            parentId: 'page1',
            name: 'Rectangle',
            childIndex: 1,
            point: [100, 100],
            size: [100, 100],
            style: {
              dash: DashStyle.Draw,
              size: SizeStyle.Medium,
              color: ColorStyle.Blue,
            },
          },
        },
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

  const handleChange = React.useCallback(
    (state: TLDrawState, patch, reason) => {
      if (!doc) return
      if (reason.startsWith('command')) {
        doc.update(patch.document)
      }
    },
    [doc]
  )

  if (doc === null) return <div>loading...</div>

  return (
    <div className="tldraw">
      <TLDraw document={doc.toObject()} onChange={handleChange} />
    </div>
  )
}
