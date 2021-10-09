/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { TLDraw, TLDrawState, TLDrawDocument, TLDrawUser, Data } from '@tldraw/tldraw'
import { createClient, Presence } from '@liveblocks/client'
import {
  LiveblocksProvider,
  RoomProvider,
  useErrorListener,
  useObject,
  useSelf,
  useOthers,
  useMyPresence,
} from '@liveblocks/react'
import { Utils } from '@tldraw/core'

interface TLDrawUserPresence extends Presence {
  user: TLDrawUser
}

const publicAPIKey = 'pk_live_1LJGGaqBSNLjLT-4Jalkl-U9'

const client = createClient({
  publicApiKey: publicAPIKey,
})

const ROOM_ID = 'mp-test-1'

export function Multiplayer() {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={ROOM_ID}>
        <TLDrawWrapper />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function TLDrawWrapper() {
  const [docId] = React.useState(() => Utils.uniqueId())

  const [error, setError] = React.useState<Error>()

  const [tlstate, setTlstate] = React.useState<TLDrawState>()

  useErrorListener((err) => setError(err))

  const doc = useObject<{ uuid: string; document: TLDrawDocument }>('doc', {
    uuid: docId,
    document: {
      id: 'test-room',
      pages: {
        page: {
          id: 'page',
          shapes: {},
          bindings: {},
        },
      },
      pageStates: {
        page: {
          id: 'page',
          selectedIds: [],
          camera: {
            point: [0, 0],
            zoom: 1,
          },
        },
      },
    },
  })

  // Put the tlstate into the window, for debugging.
  const handleMount = React.useCallback((tlstate: TLDrawState) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.tlstate = tlstate
    setTlstate(tlstate)
  }, [])

  const handleChange = React.useCallback(
    (_tlstate: TLDrawState, state: Data, reason: string) => {
      // If the client updates its document, update the room's document
      if (reason.startsWith('command')) {
        doc?.update({ uuid: docId, document: state.document })
      }

      // When the client updates its presence, update the room
      if (reason === 'patch:room:self:update' && state.room) {
        const room = client.getRoom(ROOM_ID)
        if (!room) return
        const { userId, users } = state.room
        room.updatePresence({ id: userId, user: users[userId] })
      }
    },
    [docId, doc]
  )

  React.useEffect(() => {
    const room = client.getRoom(ROOM_ID)

    if (!room) return
    if (!doc) return
    if (!tlstate) return

    // Update the user's presence with the user from state
    const { users, userId } = tlstate.state.room
    room.updatePresence({ id: userId, user: users[userId] })

    // Subscribe to presence changes; when others change, update the state
    room.subscribe<TLDrawUserPresence>('others', (others) => {
      tlstate.updateUsers(
        others
          .toArray()
          .filter((other) => other.presence)
          .map((other) => other.presence!.user)
          .filter(Boolean)
      )
    })

    room.subscribe('event', (event) => {
      if (event.event?.name === 'exit') {
        tlstate.removeUser(event.event.userId)
      }
    })

    function handleDocumentUpdates() {
      if (!doc) return
      if (!tlstate) return

      const docObject = doc.toObject()

      // Only merge the change if it caused by someone else
      if (docObject.uuid !== docId) {
        tlstate.mergeDocument(docObject.document)
      }
    }

    function handleExit() {
      room?.broadcastEvent({ name: 'exit', userId: tlstate?.state.room.userId })
    }

    window.addEventListener('beforeunload', handleExit)

    // When the shared document changes, update the state
    doc.subscribe(handleDocumentUpdates)

    // Load the shared document
    tlstate.loadDocument(doc.toObject().document)

    return () => {
      window.removeEventListener('beforeunload', handleExit)
      doc.unsubscribe(handleDocumentUpdates)
    }
  }, [doc, docId, tlstate])

  if (error) return <div>Error: {error.message}</div>

  if (doc === null) return <div>Loading...</div>

  return (
    <div className="tldraw">
      <TLDraw onChange={handleChange} onMount={handleMount} showPages={false} />
    </div>
  )
}
