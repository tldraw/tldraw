import * as React from 'react'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import dynamic from 'next/dynamic'
const MultiplayerEditor = dynamic(() => import('-components/MultiplayerEditor'), { ssr: false })

interface RoomProps {
  id: string
  isSponsor: boolean
  isUser: boolean
}

export default function Room({ id, isUser, isSponsor }: RoomProps): JSX.Element {
  return <MultiplayerEditor isUser={isUser} isSponsor={isSponsor} roomId={id} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  const id = context.query.id?.toString()

  return {
    props: {
      id,
      isUser: false,
      isSponsor: session?.user ? true : false,
    },
  }
}
