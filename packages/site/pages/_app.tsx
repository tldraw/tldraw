import { AppProps } from 'next/app'
import useGtag from '../hooks/useGtag'
import Head from 'next/head'
import './styles.css'

function MyApp({ Component, pageProps }: AppProps) {
  useGtag()

  return (
    <>
      <Head>
        <title>tldraw</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
        />
      </Head>
      <div>
        <main>
          <Component {...pageProps} />
        </main>
      </div>
    </>
  )
}

export default MyApp
