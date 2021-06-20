// import Editor from "components/editor"
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'

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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user) {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  return {
    props: {
      session,
    },
  }
}
