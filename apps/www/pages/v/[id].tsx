import { Utils } from '@tldraw/core'
import type { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import * as React from 'react'

const IFrameWarning = dynamic(() => import('~components/IFrameWarning'), {
  ssr: false,
}) as any

const ReadOnlyMultiplayerEditor = dynamic(() => import('~components/ReadOnlyMultiplayerEditor'), {
  ssr: false,
}) as any

interface RoomProps {
  id: string
}

export default function Room({ id }: RoomProps) {
  if (typeof window !== 'undefined' && window.self !== window.top) {
    return <IFrameWarning url={`https://tldraw.com/v/${id}`} />
  }

  return (
    <>
      <Head>
        <title>tldraw - {id} (read only)</title>
      </Head>
      <ReadOnlyMultiplayerEditor roomId={id} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.query.id?.toString()

  return {
    props: {
      id: Utils.lns(id),
    },
  }
}
