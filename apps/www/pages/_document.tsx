import NextDocument, { Html, Head, Main, NextScript, DocumentContext } from 'next/document'
import { getCssText } from '../styles'
import { GA_TRACKING_ID } from '../utils/gtag'

class MyDocument extends NextDocument {
  // static async getInitialProps(ctx: DocumentContext): Promise<{
  //   styles: JSX.Element
  //   html: string
  //   head?: JSX.Element[]
  // }> {
  //   try {
  //     const initialProps = await NextDocument.getInitialProps(ctx)

  //     return {
  //       ...initialProps,
  //       styles: (
  //         <>
  //           {initialProps.styles}
  //           <style id="stitches" dangerouslySetInnerHTML={{ __html: getCssText() }} />
  //         </>
  //       ),
  //     }
  //   } catch (e) {
  //     console.error(e.message)
  //   } finally {
  //     null
  //   }
  // }

  render(): JSX.Element {
    return (
      <Html lang="en">
        <Head>
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
