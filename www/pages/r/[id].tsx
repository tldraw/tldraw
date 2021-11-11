import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { getSession } from 'next-auth/client'
import dynamic from 'next/dynamic'
const MultiplayerEditor = dynamic(() => import('-components/MultiplayerEditor'), { ssr: false })

interface RoomProps {
  id: string
  isSponsor: boolean
}

export default function Room({ id, isSponsor }: RoomProps): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <MultiplayerEditor isSponsor={isSponsor} roomId={id} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  const id = context.query.id?.toString()

  return {
    props: {
      id,
      isSponsor: session?.user ? true : false,
    },
  }
}
