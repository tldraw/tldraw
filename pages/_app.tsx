import useGtag from 'hooks/useGtag'
import { AppProps } from 'next/app'
import { globalStyles } from 'styles'
import 'styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  globalStyles()
  useGtag()

  return <Component {...pageProps} />
}

export default MyApp
