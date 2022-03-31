import type { GetServerSideProps } from 'next'
import { getSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FC, useMemo } from 'react'

const Editor = dynamic(() => import('components/Editor'), { ssr: false })

interface PageProps {
  isUser: boolean
  isSponsor: boolean
}

const Home: FC<PageProps> = ({ isUser, isSponsor }) => {
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

export default Home

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)

  return {
    props: {
      isUser: session?.user ? true : false,
      isSponsor: session?.isSponsor || false,
    },
  }
}
