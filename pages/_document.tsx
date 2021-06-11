import NextDocument, { Html, Head, Main, NextScript } from 'next/document'
import { dark, getCssString } from 'styles'

class MyDocument extends NextDocument {
  static async getInitialProps(ctx) {
    try {
      const initialProps = await NextDocument.getInitialProps(ctx)

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            <style
              id="stitches"
              dangerouslySetInnerHTML={{ __html: getCssString() }}
            />
          </>
        ),
      }
    } catch (e) {
      console.error(e.message)
    } finally {
    }
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <meta name="application-name" content="tldraw" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black" />
          <meta name="apple-mobile-web-app-title" content="tldraw" />
          <meta name="description" content="A tiny little drawing app." />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="theme-color" content="#fafafa" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:url" content="https://tldraw.com" />
          <meta name="twitter:title" content="tldraw" />
          <meta
            name="twitter:description"
            content="A tiny little drawing app."
          />
          <meta name="twitter:creator" content="@steveruizok" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="tldraw" />
          <meta
            property="og:description"
            content="A tiny little drawing app."
          />
          <meta property="og:site_name" content="tldraw" />
          <meta property="og:url" content="https://tldraw.com" />
        </Head>
        <body className={dark}>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
