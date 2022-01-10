import dynamic from 'next/dynamic'
import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

const Editor = dynamic(() => import('components/Editor'), { ssr: false })

interface PageProps {
  isUser: boolean
  isSponsor: boolean
}

export default function Home({ isUser, isSponsor }: PageProps): JSX.Element {
  const { query } = useRouter()
  const isExportMode = useMemo(() => 'exportMode' in query, [query])

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id="home" isUser={isUser} isSponsor={isSponsor} showUI={!isExportMode} />
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  return {
    props: {
      isUser: session?.user ? true : false,
      isSponsor: session?.isSponsor || false,
    },
  }
}
