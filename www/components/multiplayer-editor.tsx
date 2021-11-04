/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLDraw, TLDrawState, Data, TLDrawDocument, TLDrawUser } from '@tldraw/tldraw'
import * as React from 'react'
import { createClient, Presence } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useObject, useErrorListener } from '@liveblocks/react'
import { Utils } from '@tldraw/core'

interface TLDrawUserPresence extends Presence {
  user: TLDrawUser
}

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_API_KEY,
  throttle: 80,
})

export default function MultiplayerEditor({ id }: { id: string }) {
  return (
    <LiveblocksProvider client={client}>
      <RoomProvider id={id}>
        <Editor id={id} />
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function Editor({ id }: { id: string }) {
  const [docId] = React.useState(() => Utils.uniqueId())

  const [error, setError] = React.useState<Error>()

  const [tlstate, setTlstate] = React.useState<TLDrawState>()

  useErrorListener((err) => setError(err))

  const doc = useObject<{ uuid: string; document: TLDrawDocument }>('doc', {
    uuid: docId,
    document: {
      id: 'test-room',
      ...TLDrawState.defaultDocument,
    },
  })

  // Put the tlstate into the window, for debugging.
  const handleMount = React.useCallback(
    (tlstate: TLDrawState) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.tlstate = tlstate

      tlstate.loadRoom(id)

      setTlstate(tlstate)
    },
    [id]
  )

  const handleChange = React.useCallback(
    (_tlstate: TLDrawState, state: Data, reason: string) => {
      // If the client updates its document, update the room's document
      if (reason.startsWith('command') || reason.startsWith('undo') || reason.startsWith('redo')) {
        doc?.update({ uuid: docId, document: state.document })
      }

      // When the client updates its presence, update the room
      // if (state.room && (reason === 'patch:room:self:update' || reason === 'patch:selected')) {
      //   const room = client.getRoom(ROOM_ID)
      //   if (!room) return
      //   const { userId, users } = state.room
      //   room.updatePresence({ id: userId, user: users[userId] })
      // }
    },
    [docId, doc]
  )

  React.useEffect(() => {
    const room = client.getRoom(id)

    if (!room) return
    if (!doc) return
    if (!tlstate) return
    if (!tlstate.state.room) return

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
      if (!tlstate.state.room) return

      const docObject = doc.toObject()

      // Only merge the change if it caused by someone else
      if (docObject.uuid !== docId) {
        tlstate.mergeDocument(docObject.document)
      } else {
        tlstate.updateUsers(
          Object.values(tlstate.state.room.users).map((user) => {
            // const activeShapes = user.activeShapes
            //   .map((shape) => docObject.document.pages[tlstate.currentPageId].shapes[shape.id])
            //   .filter(Boolean)
            return {
              ...user,
              // activeShapes: activeShapes,
              selectedIds: user.selectedIds, // activeShapes.map((shape) => shape.id),
            }
          })
        )
      }
    }

    function handleExit() {
      if (!(tlstate && tlstate.state.room)) return
      room?.broadcastEvent({ name: 'exit', userId: tlstate.state.room.userId })
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
  }, [doc, docId, tlstate, id])

  const handleUserChange = React.useCallback(
    (tlstate: TLDrawState, user: TLDrawUser) => {
      const room = client.getRoom(id)
      room?.updatePresence({ id: tlstate.state.room?.userId, user })
    },
    [id]
  )

  if (error) return <div>Error: {error.message}</div>

  if (doc === null) return <div>Loading...</div>

  return (
    <div className="tldraw">
      <TLDraw
        onMount={handleMount}
        onChange={handleChange}
        onUserChange={handleUserChange}
        showPages={false}
        autofocus
      />
    </div>
  )
}
