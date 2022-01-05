import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import Cors from 'cors'
import type { TDExport, TldrawApp } from '@tldraw/tldraw'

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
    viewport: { width, height },
    type,
  } = body
  let browser: puppeteer.Browser = null
  try {
    browser = await puppeteer.launch({
      ignoreHTTPSErrors: true,
      headless: true,
    })
    const page = await browser.newPage()
    await page.goto(FRONTEND_URL, { timeout: 15 * 1000 })
    await page.setViewport({ width: Math.floor(width * 2), height: Math.floor(height * 2) })
    await page.waitForSelector('#canvas')
    await page.evaluate(async (body: TDExport) => {
      let app = window.app
      if (!app) {
        await new Promise((resolve) => setTimeout(resolve, 250))
        app = window.app
      }
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
