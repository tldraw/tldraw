import dynamic from 'next/dynamic'
import Head from 'next/head'

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <button
        onClick={() => {
          throw Error('oh no!')
        }}
      >
        error me
      </button>
    </>
  )
}
