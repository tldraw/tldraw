import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import * as React from 'react'

export default function RandomRoomPage() {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
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
    props: {},
  }
}
