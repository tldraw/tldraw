import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const MultiplayerEditor = dynamic(() => import('-components/MultiplayerEditor'), { ssr: false })

interface RoomProps {
  id: string
}

export default function Room({ id }: RoomProps): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <MultiplayerEditor roomId={id} />
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
