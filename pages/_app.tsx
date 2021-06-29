import useGtag from 'hooks/useGtag'
import Head from 'next/head'
import { AppProps } from 'next/app'
import { globalStyles } from 'styles'
import { Provider } from 'next-auth/client'
import 'styles/globals.css'

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  globalStyles()

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
      <Provider session={pageProps.session}>
        <Component {...pageProps} />
      </Provider>
    </>
  )
}

export default MyApp
