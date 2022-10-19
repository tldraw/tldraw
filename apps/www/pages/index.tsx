import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo } from 'react';


const Editor = dynamic(() => import('~components/Editor'), { ssr: false }) as any
const VideoCall = dynamic(() => import('~components/VideoCall/VideoCall'), { ssr: false })
const Auth = dynamic(() => import('~components/Auth/Auth.lazy'), { ssr: false })
const Devtool = dynamic(() => import('~components/Devtool'), { ssr: false })

const Home = () => {
  const { query } = useRouter()
  const isExportMode = useMemo(() => 'exportMode' in query, [query])

  return (
    <>
      <Head>
        <title>tldraw</title>
      </Head>
      <Editor id="home" showUI={!isExportMode} />
      <VideoCall />
      <Auth />
      <Devtool />
    </>
  )
}

export default Home