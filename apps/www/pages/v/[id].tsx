import * as React from 'react'
import type { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'
import * as gtag from 'utils/gtag'
import { Utils } from '@tldraw/core'

const IFrameWarning = dynamic(() => import('components/IFrameWarning'), {
  ssr: false,
}) as any

const ReadOnlyMultiplayerEditor = dynamic(() => import('components/ReadOnlyMultiplayerEditor'), {
  ssr: false,
}) as any

interface RoomProps {
  id: string
}

export default function Room({ id }: RoomProps) {
  if (typeof window !== 'undefined' && window.self !== window.top) {
    gtag.event({
      action: 'connect_to_readonly_room_in_iframe',
      category: 'v1',
      label: id,
      value: 0,
    })

    return <IFrameWarning url={`https://tldraw.com/v/${id}`} />
  }

  gtag.event({
    action:
      process.env.NODE_ENV === 'production'
        ? 'connect_to_readonly_room'
        : 'connect_to_readonly_room_dev',
    category: 'v1',
    label: id,
    value: 0,
  })

  return <ReadOnlyMultiplayerEditor roomId={id} />
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.query.id?.toString()

  return {
    props: {
      id: Utils.lns(id),
    },
  }
}
