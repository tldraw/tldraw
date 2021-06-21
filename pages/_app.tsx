import useGtag from 'hooks/useGtag'
import { AppProps } from 'next/app'
import { globalStyles } from 'styles'
import { Provider } from 'next-auth/client'
import 'styles/globals.css'

function MyApp({ Component, pageProps }: AppProps): JSX.Element {
  globalStyles()

  useGtag()

  return (
    <Provider session={pageProps.session}>
      <Component {...pageProps} />
    </Provider>
  )
}

export default MyApp
