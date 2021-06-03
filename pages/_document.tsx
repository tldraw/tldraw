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
        <Head />
        <body className={dark}>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
