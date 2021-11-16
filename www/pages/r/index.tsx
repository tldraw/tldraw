import * as React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'

interface RoomProps {
  id?: string
}

export default function RandomRoomPage({ id }: RoomProps): JSX.Element {
  return (
    <>
      <Head>
        <title>Tldraw</title>
      </Head>
      <div>Should have routed to room: {id}</div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Generate random id
  const id = Date.now().toString()

  // Route to a room with that id
  context.res.setHeader('Location', `/r/${id}`)
  context.res.statusCode = 307

  // Return id (though it shouldn't matter)
  return {
    props: {
      id,
    },
  }
}
