import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getSession } from 'next-auth/client'
import dynamic from 'next/dynamic'
import { supabase } from '-supabase/client'
import { fetchProject } from '-supabase/server-functions'
import type { TLDrawProject } from '-types'
import type { TLDrawState, TLDrawDocument } from '@tldraw/tldraw'
import { Patch, Utils } from '@tldraw/core'
const Editor = dynamic(() => import('components/editor'), { ssr: false })

interface RoomProps {
  id: string
  project: TLDrawProject
}

const updateDoc = async (doc: TLDrawDocument, userId: string, id: string) => {
  await supabase
    .from<TLDrawProject>('projects')
    .update({ document: doc, nonce: userId })
    .eq('id', id)
}

export default function Room({ id, project }: RoomProps): JSX.Element {
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

  const handleMount = React.useCallback(
    (tlstate: TLDrawState) => {
      rState.current = tlstate
      rState.current.loadDocument(project.document)
    },
    [project]
  )

  const handleChange = React.useCallback(
    (tlstate: TLDrawState, reason: string) => {
      if (
        !(reason.startsWith('command') || reason.startsWith('undo') || reason.startsWith('redo'))
      ) {
        return
      }

      updateDoc(tlstate.document, userId.current, id)
    },
    [id]
  )

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id={id} document={project.document} onChange={handleChange} onMount={handleMount} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user && process.env.NODE_ENV !== 'development') {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  const id = context.query.id?.toString()

  // Get document from database
  // If document does not exist, create an empty document
  // Return the document

  const project = await fetchProject(id)

  return {
    props: {
      id,
      session,
      project,
    },
  }
}
