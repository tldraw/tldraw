import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import Cors from 'cors'
import { TDExport, TDExportTypes, TldrawApp } from '@tldraw/tldraw'

const cors = Cors({
  methods: ['POST'],
})

function runMiddleware(req, res, fn) {
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
  let browser: puppeteer.Browser = null
  try {
    browser = await puppeteer.launch({
      slowMo: 50,
      ignoreHTTPSErrors: true,
      headless: true,
    })
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
    )
    await page.setViewport({ width: Math.floor(width), height: Math.floor(height) })
    await page.goto(FRONTEND_URL, { timeout: 15 * 1000, waitUntil: 'networkidle0' })
    await page.evaluateHandle('document.fonts.ready')
    await page.evaluate(async (body: TDExport) => {
      let app = window.app
      if (!app) app = await new Promise((resolve) => setTimeout(() => resolve(window.app), 250))
      await app.ready
      const { assets, shapes } = body
      app.patchAssets(assets)
      app.createShapes(...shapes)
      app.selectAll()
      app.zoomToSelection()
      app.selectNone()
    }, body)
    const imageBuffer = await page.screenshot({
      type,
    })
    res.status(200).send(imageBuffer)
  } catch (err) {
    console.error(err.message)
    res.status(500).send(err)
  } finally {
    await browser.close()
  }
}
