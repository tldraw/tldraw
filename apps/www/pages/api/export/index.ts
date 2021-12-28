import { NextApiRequest, NextApiResponse } from 'next'
import puppeteer from 'puppeteer'
import Cors from 'cors'

const cors = Cors({
  methods: ['POST'],
})

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }

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
    app: any
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors)

  const { body } = req

  let browser: puppeteer.Browser = null

  try {
    browser = await puppeteer.launch({ headless: true })

    const page = await browser.newPage()

    await page.goto(FRONTEND_URL)
    await page.evaluate(async (body: { [key: string]: any }) => {
      const app = window.app

      app.patchAssets(body.assets)
      app.createShapes(...body.shapes)
      app.selectAll()
      app.zoomToFit()
      app.selectNone()
    }, body)

    const file = await page.screenshot({ type: body.type })
    res.status(200).end(file)
  } catch (err) {
    res.status(500).end(err)
  } finally {
    await browser.close()
  }
}
