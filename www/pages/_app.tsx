import '../styles/globals.css'
import { init } from '-utils/sentry'
import Head from 'next/head'
import useGtag from '-utils/useGtag'

init()

function MyApp({ Component, pageProps }) {
  useGtag()

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
        />
        <title>TLDraw</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
