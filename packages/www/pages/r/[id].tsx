import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { supabase } from '-supabase/client'
import type { TLDrawProject } from '-types'
import type { TLDrawState } from '@tldraw/tldraw'
import { Utils } from '@tldraw/core'
const Editor = dynamic(() => import('components/editor'), { ssr: false })

interface RoomProps {
  id: string
  project: TLDrawProject
}

export default function Room({ id }: RoomProps): JSX.Element {
  const rState = React.useRef<TLDrawState>(null)

  const userId = React.useRef(Utils.uniqueId())

  React.useEffect(() => {
    const sub = supabase
      .from('projects')
      .on('*', (payload) => {
        if (payload.new.nonce !== userId.current) {
          rState.current.mergeDocument(payload.new.document)
        }
      })
      .subscribe()
    return () => {
      sub.unsubscribe()
    }
  }, [id])

  const handleMount = React.useCallback((tlstate: TLDrawState) => {
    rState.current = tlstate
  }, [])

  const handleChange = React.useCallback(
    (tlstate: TLDrawState, reason: string) => {
      if (
        !(reason.startsWith('command') || reason.startsWith('undo') || reason.startsWith('redo'))
      ) {
        return
      }

      supabase
        .from<TLDrawProject>('projects')
        .update({ document: tlstate.document, nonce: userId.current })
        .eq('id', id)
        .then(() => void null)
    },
    [id]
  )

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id={id} onChange={handleChange} onMount={handleMount} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.query.id?.toString()

  return {
    props: {
      id,
    },
  }
}
