import dynamic from 'next/dynamic'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/client'
import Head from 'next/head'

const Editor = dynamic(() => import('components/Editor'), { ssr: false })

interface PageProps {
  isUser: boolean
  isSponsor: boolean
}

export default function Home({ isUser, isSponsor }: PageProps): JSX.Element {
  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id="home" isUser={isUser} isSponsor={isSponsor} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  return {
    props: {
      isUser: session?.user ? true : false,
      isSponsor: session?.user ? true : false,
    },
  }
}
