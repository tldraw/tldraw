import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getSession } from 'next-auth/client'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('components/editor'), { ssr: false })

interface RoomProps {
  id: string
}

export default function Room({ id }: RoomProps): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id={id} />
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

  return {
    props: {
      id,
      session,
    },
  }
}
