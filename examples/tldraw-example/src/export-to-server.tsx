import { Utils } from '@tldraw/core'
import {
  ImageShape,
  TDAssetType,
  TDAssets,
  TDExportType,
  TDShape,
  TDShapeType,
  TLDR,
  Tldraw,
  TldrawApp,
} from '@tldraw/tldraw'
import Vec from '@tldraw/vec'
import * as React from 'react'

export default function Export() {
  const handleExport = React.useCallback(async (app: TldrawApp) => {
    exportViaServer(app, TDExportType.PNG)
  }, [])

  return (
    <div className="tldraw">
      <Tldraw onExport={handleExport} />
    </div>
  )
}

async function exportViaServer(app: TldrawApp, type: TDExportType) {
  app.setIsLoading(true)

  const name = app.page.name ?? 'export'

  // Export the selection, if any, or else the entire page.
  const { currentPageId } = app
  const shapeIds = app.selectedIds.length ? app.selectedIds : Object.keys(app.page.shapes)

  try {
    const assets: TDAssets = {}

    // Collect shapes and assets (serializing assets if needed)
    const shapes: TDShape[] = shapeIds.map((id) => {
      const shape = { ...app.getShape(id) }

      if (shape.assetId) {
        const asset = { ...app.document.assets[shape.assetId] }

        // If the asset is a GIF, then serialize an image
        if (asset.src.toLowerCase().endsWith('gif')) {
          asset.src = app.serializeImage(shape.id)
        }

        // If the asset is an image, then serialize an image
        if (shape.type === TDShapeType.Video) {
          asset.src = app.serializeVideo(shape.id)
          asset.type = TDAssetType.Image
          // Cast shape to image shapes to properly display snapshots
          ;(shape as unknown as ImageShape).type = TDShapeType.Image
        }

        // Patch asset table
        assets[shape.assetId] = asset
      }

      return shape
    })

    const { width, height } = Utils.expandBounds(TLDR.getSelectedBounds(app.state), 64)
    const size = [width, height]

    // Create serialized data for JSON or SVGs
    let serialized: string | undefined

    switch (type) {
      case TDExportType.SVG: {
        const svg = await app.getSvg(shapeIds, {
          includeFonts: true,
        })

        if (!svg) {
          throw Error('Could not get an SVG.')
        }

        serialized = TLDR.getSvgString(svg, 1)
        break
      }
      case TDExportType.JSON: {
        serialized = JSON.stringify(shapes, null, 2)
        break
      }
    }

    if (serialized) {
      // If we have serialized data, then just download this locally as a file
      const link = document.createElement('a')
      link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(serialized)
      link.download = name + '.' + type
      link.click()

      return
    }

    // Post the export info to a server that can create an image.
    // See: https://gist.github.com/steveruizok/c30fc99b9b3d95a14c82c59bdcc69201
    const endpoint = 'some_serverless_endpoint'

    // The response should be a blob (e.g. an image or JSON file)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        currentPageId,
        shapes,
        assets,
        type,
        size: type === 'png' ? Vec.mul(size, 2) : size,
      }),
    })

    // Download the blob from the response
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = name + '.' + type
    link.click()
  } catch (error) {
    console.error(error)
  } finally {
    app.setIsLoading(false)
  }
}
