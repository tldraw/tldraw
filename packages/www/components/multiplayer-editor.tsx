import { TLDraw, TLDrawState, Data, TLDrawDocument } from '@tldraw/tldraw'
import * as gtag from '-utils/gtag'
import * as React from 'react'
import { createClient } from '@liveblocks/client'
import { LiveblocksProvider, RoomProvider, useObject, useErrorListener } from '@liveblocks/react'
import { Utils } from '@tldraw/core'

const client = createClient({
  publicApiKey: 'pk_live_1LJGGaqBSNLjLT-4Jalkl-U9',
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
  const [uuid] = React.useState(() => Utils.uniqueId())
  const [error, setError] = React.useState<Error>(null)
  const [tlstate, setTlstate] = React.useState<TLDrawState>()

  useErrorListener((err) => {
    console.log(err)
    setError(err)
  })

  const doc = useObject<{ uuid: string; document: TLDrawDocument }>('doc', {
    uuid,
    document: {
      id,
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
          doc.update({ uuid, document: state.document })
        }
      }
    },
    [uuid, doc]
  )

  React.useEffect(() => {
    if (!doc) return
    if (!tlstate) return

    function updateState() {
      const docObject = doc.toObject()
      if (docObject.uuid === uuid) return
      tlstate.mergeDocument(docObject.document)
    }

    updateState()
    doc.subscribe(updateState)

    return () => doc.unsubscribe(updateState)
  }, [doc, uuid, tlstate])

  if (error) return <div>Error: {error.message}</div>

  if (doc === null) return <div>loading...</div>

  return (
    <div className="tldraw">
      <TLDraw onMount={handleMount} onChange={handleChange} autofocus />
    </div>
  )
}
