import { NextApiRequest, NextApiResponse } from 'next'
import chromium from 'chrome-aws-lambda'
import Cors from 'cors'
import { TDExport, TDExportTypes, TldrawApp } from '@tldraw/tldraw'

const cors = Cors({
  methods: ['POST'],
})

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: (req: NextApiRequest, res: NextApiResponse, fn: (args: any) => any) => any
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result)
      return resolve(result)
    })
  })
}

const FRONTEND_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/?exportMode'
    : 'https://www.tldraw.com/?exportMode'

declare global {
  interface Window {
    app: TldrawApp
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors)
  const { body } = req
  const {
    size: [width, height],
    type,
  } = body
  if (type === TDExportTypes.PDF) res.status(500).send('Not implemented yet.')
  try {
    const browser = await chromium.puppeteer.launch({
      slowMo: 50,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      ignoreHTTPSErrors: true,
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
    )
    await page.goto(FRONTEND_URL, { timeout: 15 * 1000, waitUntil: 'networkidle0' })
    await page.setViewport({ width: Math.floor(width), height: Math.floor(height) })
    await page.evaluateHandle('document.fonts.ready')
    let err: string
    await page.evaluate(async (body: TDExport) => {
      try {
        let app = window.app
        if (!app) app = await new Promise((resolve) => setTimeout(() => resolve(window.app), 250))
        await app.ready
        const { assets, shapes, currentPageId } = body
        // If the hapes were a direct child of their current page,
        // reparent them to the app's current page.
        shapes.forEach((shape) => {
          if (shape.parentId === currentPageId) {
            shape.parentId = app.currentPageId
          }
        })
        app.patchAssets(assets)
        app.createShapes(...shapes)
        app.selectAll()
        app.zoomToSelection()
        app.selectNone()
        const tlContainer = document.getElementsByClassName('tl-container').item(0) as HTMLElement
        if (tlContainer) {
          tlContainer.style.background = 'transparent'
        }
      } catch (e) {
        err = e.message
      }
    }, body)
    if (err) {
      throw err
    }
    const imageBuffer = await page.screenshot({
      type,
      omitBackground: true,
    })
    await browser.close()
    res.status(200).send(imageBuffer)
  } catch (err) {
    console.error(err.message)
    res.status(500).send(err)
  }
}

// Allow the server to support requests with up to 5mb of data.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}
