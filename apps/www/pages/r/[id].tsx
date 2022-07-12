import * as React from 'react'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import dynamic from 'next/dynamic'

const IFrameWarning = dynamic(() => import('components/IFrameWarning'), {
  ssr: false,
}) as any

const MultiplayerEditor = dynamic(() => import('components/MultiplayerEditor'), {
  ssr: false,
}) as any

interface RoomProps {
  id: string
  isSponsor: boolean
  isUser: boolean
}

export default function Room({ id, isUser, isSponsor }: RoomProps) {
  if (typeof window !== 'undefined' && window.self !== window.top) {
    return <IFrameWarning url={`https://tldraw.com/r/${id}`} />
  }

  return <MultiplayerEditor isUser={isUser} isSponsor={isSponsor} roomId={id} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  const id = context.query.id?.toString()

  return {
    props: {
      id,
      isUser: session?.user ? true : false,
      isSponsor: session?.isSponsor ?? false,
    },
  }
}
