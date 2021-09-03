import Head from 'next/head'
import dynamic from 'next/dynamic'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'

const Editor = dynamic(() => import('components/editor'), { ssr: false })

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <div>
        <Editor />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  if (!session?.user && process.env.NODE_ENV !== 'development') {
    context.res.setHeader('Location', `/sponsorware`)
    context.res.statusCode = 307
  }

  return {
    props: {
      session,
    },
  }
}
