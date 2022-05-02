import { NextApiRequest, NextApiResponse } from 'next'
import chromium from 'chrome-aws-lambda'
import Cors from 'cors'
import {
  TDAssets,
  TDAssetType,
  TDExport,
  TDExportTypes,
  TDShape,
  getShapeUtil,
  TldrawApp,
} from '@tldraw/tldraw'
import { Utils } from '@tldraw/core'
import fetch from 'node-fetch'

interface ExportShapeProps {
  width?: number
  height?: number
  body?: any
  type?: any
  res: NextApiResponse
}

const whiteList = ['https://raw.githubusercontent.com']

const cors = Cors({
  methods: ['POST', 'GET'],
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

async function exportShape({ width, height, body, type, res }: ExportShapeProps) {
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

async function extractFileInfo(filePath: string, page?: string): Promise<TDExport | string> {
  try {
    const response = await fetch(filePath)
    const content = JSON.parse(await response.text())
    const pageIds = Object.keys(content.document.pages)
    const currentPageId = page ? pageIds[parseInt(page) - 1] : pageIds[0]
    const shapeIds = Object.keys(content.document.pages[currentPageId].shapes)
    const assets: TDAssets = {}
    const shapes: TDShape[] = shapeIds.map((id) => {
      const shape = { ...content.document.pages[currentPageId].shapes[id] }
      if (shape.assetId) {
        const asset = { ...content.document.assets[shape.assetId] }
        // If the asset is not a GIF, or video pass the assets
        if (!asset.src.toLowerCase().endsWith('gif') && shape.type == TDAssetType.Image) {
          assets[shape.assetId] = asset
        }
        // Patch asset table
      }
      return shape
    })
    const bounds = shapes.map((shape) => {
      return getShapeUtil(shape).getBounds(shape)
    })

    const { width, height } = Utils.expandBounds(Utils.getCommonBounds(bounds), 64)
    const tdExport: TDExport = {
      currentPageId,
      name: content.document.pages[currentPageId].name ?? 'export',
      shapes,
      type: TDExportTypes.PNG,
      assets,
      size: [width, height],
    }
    return tdExport
  } catch (error) {
    // we'll returned image here instead
    return error.message
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors)
  const {
    body,
    method,
    query: { url, page },
  } = req
  switch (method) {
    case 'POST':
      const {
        size: [width, height],
        type,
      } = body
      if (type === TDExportTypes.PDF) res.status(500).send('Not implemented yet.')
      exportShape({ width, height, body, type, res })
      break
    case 'GET':
      const paramUrl = new URL(url as string)
      // checking if the passed url contain the whitelisted origin
      if (whiteList.indexOf(paramUrl.origin) !== -1) {
        const response = await extractFileInfo(url as string, page as string)
        if (typeof response === 'string') res.status(200).send(response)
        const { size } = response as TDExport
        await exportShape({
          width: size[0],
          height: size[1],
          body: response,
          type: TDExportTypes.PNG,
          res,
        })
      } else
        res.status(401).send('Blocked by cors, we are currently accepting file from github raw')
      break
    default:
      res.status(500).send('This endpoint only accept GET and POST method')
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
