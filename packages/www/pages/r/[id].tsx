import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { supabase } from '-supabase/client'
import type { TLDrawProject } from '-types'
import type { TLDrawState, TLDrawPatch } from '@tldraw/tldraw'
import { Utils } from '@tldraw/core'
const Editor = dynamic(() => import('components/editor'), { ssr: false })

interface RoomProps {
  id: string
  project: TLDrawProject
}

export default function Room({ id }: RoomProps): JSX.Element {
  const rState = React.useRef<TLDrawState>(null)
  const [ready, setReady] = React.useState(false)

  const rTimer = React.useRef(0)
  const rStartTime = React.useRef(0)
  const rPendingPatches = React.useRef<{ time: number; patch: TLDrawPatch }[]>([])
  const rUnsub = React.useRef<any>()

  const userId = React.useRef(Utils.uniqueId())

  React.useEffect(() => {
    return () => {
      clearTimeout(rTimer.current)
      if (rUnsub.current) {
        rUnsub.current?.()
      }
    }
  }, [id, ready])

  const handleMount = React.useCallback((tlstate: TLDrawState) => {
    rState.current = tlstate
  }, [])

  React.useEffect(() => {
    supabase
      .from<TLDrawProject>('projects')
      .select('*')
      .eq('id', id)
      .then(({ data }) => {
        const project = data[0]

        if (project && rState.current) {
          rState.current.loadDocument(project.document)
          setReady(true)
        }
      })

    const sub = supabase
      .from('projects')
      .on('*', (payload) => {
        if (payload.new.nonce !== userId.current) {
          rState.current.mergePatches(payload.new.patch)
        }
      })
      .subscribe()

    rUnsub.current = () => sub.unsubscribe()

    return () => {
      rUnsub.current?.()
    }
  })

  const handlePatch = React.useCallback(
    (tlstate: TLDrawState, reason: string, patch: TLDrawPatch) => {
      if (rPendingPatches.current.length === 0) {
        rStartTime.current = Date.now()
        const handle = setTimeout(() => {
          const patches = rPendingPatches.current
          rPendingPatches.current = []
          rStartTime.current = 0
          supabase
            .from<TLDrawProject>('projects')
            .update({
              document: tlstate.document,
              patch: patches,
              nonce: userId.current,
            })
            .eq('id', id)
            .then(() => void null)
        }, 100)

        rTimer.current = handle as any
      }

      rPendingPatches.current.push({ time: Date.now() - rStartTime.current, patch })
    },
    [id]
  )

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id={id} onPatch={handlePatch} onMount={handleMount} />
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
