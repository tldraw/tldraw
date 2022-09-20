import { Utils } from '@tldraw/core'
import { TDDocument } from '@tldraw/tldraw'
import { NextApiRequest, NextApiResponse } from 'next'

type RequestBody = {
  pageId: string
  document: TDDocument
}

export default async function CreateMultiplayerRoom(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Get an authentication token from Liveblocks

    const { token } = await fetch('https://liveblocks.io/api/authorize', {
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }).then((d) => d.json())

    // 2. Create the Liveblocks storage JSON

    const { pageId, document } = JSON.parse(req.body) as RequestBody

    const storageJson = {
      liveblocksType: 'LiveObject',
      data: {
        version: 2.1,
        shapes: {
          liveblocksType: 'LiveMap',
          data: {},
        },
        bindings: {
          liveblocksType: 'LiveMap',
          data: {},
        },
        assets: {
          liveblocksType: 'LiveMap',
          data: {},
        },
      },
    }

    const page = document.pages[pageId]

    storageJson.data.shapes.data = page.shapes ?? {}
    storageJson.data.bindings.data = page.bindings ?? {}
    storageJson.data.assets.data = document.assets ?? {}

    // 3. Post the JSON and token to Liveblocks

    const roomId = Utils.uniqueId()

    const result = await fetch(`https://liveblocks.net/api/v1/room/${roomId}/storage`, {
      method: 'POST',
      body: JSON.stringify(storageJson),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (result.status === 200) {
      // If success, send back the url for the new multiplayer project
      res.send({ status: 'success', message: result.statusText, url: '/r/' + roomId })
    } else {
      throw Error(result.statusText)
    }
  } catch (e) {
    res.send({ status: 'error', message: e.message })
  }
}
