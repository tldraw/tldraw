import useGtag from 'hooks/useGtag'
import { AppProps } from 'next/app'
import { globalStyles } from 'styles'
import 'styles/globals.css'
import { Provider } from 'next-auth/client'

function MyApp({ Component, pageProps }: AppProps) {
  globalStyles()

  useGtag()

  return (
    <Provider session={pageProps.session}>
      <Component {...pageProps} />
    </Provider>
  )
}

export default MyApp
