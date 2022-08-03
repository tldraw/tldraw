import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

const Editor = dynamic(() => import('~components/Editor'), { ssr: false }) as any

const Home = () => {
  const { query } = useRouter()
  const isExportMode = useMemo(() => 'exportMode' in query, [query])

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id="home" showUI={!isExportMode} />
    </>
  )
}

export default Home
