import NextDocument, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'
import { getCssText } from '../styles'
import { GA_TRACKING_ID } from '../utils/gtag'

const APP_NAME = 'Tldraw'
const APP_DESCRIPTION = 'A tiny little drawing app.'
const APP_URL = 'https://tldraw.com'

class MyDocument extends NextDocument {
  static async getInitialProps(ctx: DocumentContext): Promise<{
    styles: JSX.Element
    html: string
    head?: JSX.Element[]
  }> {
    try {
      const initialProps = await NextDocument.getInitialProps(ctx)

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            <style id="stitches" dangerouslySetInnerHTML={{ __html: getCssText() }} />
          </>
        ),
      }
    } catch (e) {
      console.error(e.message)
    } finally {
      null
    }
  }

  render(): JSX.Element {
    return (
      <Html lang="en">
        <Head>
          <meta name="application-name" content={APP_NAME} />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black" />
          <meta name="apple-mobile-web-app-title" content={APP_NAME} />
          <meta name="description" content={APP_DESCRIPTION} />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="theme-color" content="#fafafa" />

          <meta name="twitter:card" content="summary" />
          <meta name="twitter:url" content={APP_URL} />
          <meta name="twitter:title" content={APP_NAME} />
          <meta name="twitter:description" content={APP_DESCRIPTION} />
          <meta name="twitter:creator" content="@steveruizok" />

          <meta property="og:type" content="website" />
          <meta property="og:title" content={APP_NAME} />
          <meta property="og:description" content={APP_DESCRIPTION} />
          <meta property="og:site_name" content={APP_NAME} />
          <meta property="og:url" content={APP_URL} />

          <link rel="manifest" href="/manifest.json" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />

          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
          `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
