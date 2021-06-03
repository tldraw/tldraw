// import Editor from "components/editor"
import Head from 'next/head'
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('components/editor'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor />
    </>
  )
}
