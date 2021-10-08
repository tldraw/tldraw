import * as React from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
const MultiplayerEditor = dynamic(() => import('components/multiplayer-editor'), { ssr: false })

export default function Room(): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <MultiplayerEditor id={'shhhmp'} />
    </>
  )
}
