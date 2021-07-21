import useGtag from 'hooks/useGtag'
import Head from 'next/head'
import { AppProps } from 'next/app'
import { globalStyles, dark, light } from 'styles'
import { Provider } from 'next-auth/client'
import { init } from 'utils/sentry'
import 'styles/globals.css'
import { ThemeProvider } from 'next-themes'

init()

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
      <ThemeProvider
        disableTransitionOnChange
        attribute="class"
        value={{ light: light.toString(), dark: dark.toString() }}
        defaultTheme="light"
      >
        <Provider session={pageProps.session}>
          <Component {...pageProps} />
        </Provider>
      </ThemeProvider>
    </>
  )
}

export default MyApp
