import dynamic from 'next/dynamic'
import { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import Head from 'next/head'

const Editor = dynamic(() => import('components/editor'), { ssr: false })

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id="home" />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  return {
    props: {
      session,
    },
  }
}
