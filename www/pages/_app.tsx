import '../styles/globals.css'
import { init } from '-utils/sentry'
import useGtag from '-utils/useGtag'

init()

function MyApp({ Component, pageProps }) {
  useGtag()

  return <Component {...pageProps} />
}

export default MyApp
