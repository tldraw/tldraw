import * as React from 'react'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { Utils } from '@tldraw/core'
const ReadOnlyMultiplayerEditor = dynamic(() => import('components/ReadOnlyMultiplayerEditor'), {
  ssr: false,
}) as any

interface RoomProps {
  id: string
  isSponsor: boolean
  isUser: boolean
}

export default function Room({ id, isUser, isSponsor }: RoomProps) {
  return <ReadOnlyMultiplayerEditor isUser={isUser} isSponsor={isSponsor} roomId={id} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  const id = context.query.id?.toString()

  return {
    props: {
      id: Utils.lns(id),
      isUser: session?.user ? true : false,
      isSponsor: session?.isSponsor ?? false,
    },
  }
}
