import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('components/editor'), { ssr: false })
import Head from 'next/head'

export default function Shhh(): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id="home" />
    </>
  )
}
