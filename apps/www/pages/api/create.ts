import type { NextApiRequest, NextApiResponse } from 'next'
import { TDDocument } from '@tldraw/tldraw'

export default async function CreateMultiplayerRoom(req: NextApiRequest, res: NextApiResponse) {
  const { body } = req

  try {
    const json = JSON.parse(body) as {
      roomId: string
      pageId: string
      document: TDDocument
    }
    const { roomId, pageId, document } = json

    const requestBody = {
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

    requestBody.data.shapes.data = document.pages[pageId].shapes ?? {}
    requestBody.data.bindings.data = document.pages[pageId].bindings ?? {}
    requestBody.data.assets.data = document.assets ?? {}

    const auth = await fetch('https://liveblocks.io/api/authorize', {
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    }).then((d) => d.json())

    // // GET
    // const result = await fetch(`https://liveblocks.net/api/v1/room/1652883688619/storage`, {
    //   method: 'GET',
    //   headers: {
    //     Authorization: `Bearer ${auth.token}`,
    //     'Content-Type': 'application/json',
    //   },
    // }).then((d) => d.json())

    //POST
    const result = await fetch(`https://liveblocks.net/api/v1/room/${roomId}/storage`, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (result.status === 200) {
      res.send({ status: 'success', roomId })
    }
  } catch (e) {
    res.send({ status: 'error' })
    // noop
  }
}
