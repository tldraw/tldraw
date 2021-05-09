import { AppProps } from "next/app"
import { globalStyles } from "styles"
import "styles/globals.css"

function MyApp({ Component, pageProps }: AppProps) {
  globalStyles()
  return <Component {...pageProps} />
}

export default MyApp
