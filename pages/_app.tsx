import { AppProps } from 'next/app'
import { globalStyles } from 'styles'
import 'styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  globalStyles()
  return (
    <>
      <head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
