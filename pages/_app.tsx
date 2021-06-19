import useGtag from 'hooks/useGtag'
import { AppProps } from 'next/app'
import { globalStyles } from 'styles'
import 'styles/globals.css'
import { Provider } from 'next-auth/client'
import { init } from 'utils/sentry'

function MyApp({ Component, pageProps }: AppProps) {
  globalStyles()
  useGtag()
  init()

  return (
    <Provider session={pageProps.session}>
      <Component {...pageProps} />
    </Provider>
  )
}

export default MyApp
