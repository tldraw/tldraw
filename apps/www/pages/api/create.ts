import type { NextApiRequest, NextApiResponse } from 'next'
import { nanoid } from 'nanoid'
import { decompress } from 'lz-string'
import { TDDocument } from '@tldraw/tldraw'

export default async function CreateMultiplayerRoom(req: NextApiRequest, res: NextApiResponse) {
  const { body } = req

  const document = JSON.parse(body) as TDDocument

  const requestBody = {
    liveblocksType: 'LiveObject',
    data: {
      version: 2.1,
      shapes: {
        liveblocksType: 'LiveMap',
        data: {
          // '932a3f1a-bd52-463e-062c-36aa675e210c': {
          //   id: '932a3f1a-bd52-463e-062c-36aa675e210c',
          //   type: 'rectangle',
          //   name: 'Rectangle',
          //   parentId: 'page',
          //   childIndex: 1,
          //   point: [350.79, 521.71],
          //   size: [105.44, 102.49],
          //   rotation: 0,
          //   style: {
          //     color: 'black',
          //     size: 'small',
          //     isFilled: false,
          //     dash: 'draw',
          //     scale: 1,
          //   },
          //   label: '',
          //   labelPoint: [0.5, 0.5],
          // },
          // 'c7b47e05-3889-432e-2876-54a5a0f07cc2': {
          //   id: 'c7b47e05-3889-432e-2876-54a5a0f07cc2',
          //   type: 'rectangle',
          //   name: 'Rectangle',
          //   parentId: 'page',
          //   childIndex: 2,
          //   point: [779.85, 331.34],
          //   size: [108.24, 95.22],
          //   rotation: 0,
          //   style: {
          //     color: 'black',
          //     size: 'small',
          //     isFilled: false,
          //     dash: 'draw',
          //     scale: 1,
          //   },
          //   label: '',
          //   labelPoint: [0.5, 0.5],
          // },
          // '34736c43-059f-4a6f-2831-a0079823415c': {
          //   id: '34736c43-059f-4a6f-2831-a0079823415c',
          //   type: 'arrow',
          //   name: 'Arrow',
          //   parentId: 'page',
          //   childIndex: 3,
          //   point: [456.23, 398.29],
          //   rotation: 0,
          //   bend: 0,
          //   handles: {
          //     start: {
          //       id: 'start',
          //       index: 0,
          //       point: [0, 149.11],
          //       canBind: true,
          //       bindingId: 'be9bddcd-ccdd-48ea-1158-fff8c6ce091d',
          //     },
          //     end: {
          //       id: 'end',
          //       index: 1,
          //       point: [307.62, 0],
          //       canBind: true,
          //       bindingId: '312798e5-08e1-4f6f-02b6-42dea73e3aa4',
          //     },
          //     bend: {
          //       id: 'bend',
          //       index: 2,
          //       point: [153.81, 74.56],
          //     },
          //   },
          //   decorations: {
          //     end: 'arrow',
          //   },
          //   style: {
          //     color: 'black',
          //     size: 'small',
          //     isFilled: false,
          //     dash: 'draw',
          //     scale: 1,
          //   },
          //   label: '',
          //   labelPoint: [0.5, 0.5],
          // },
        },
      },
      bindings: {
        liveblocksType: 'LiveMap',
        data: {
          // 'be9bddcd-ccdd-48ea-1158-fff8c6ce091d': {
          //   id: 'be9bddcd-ccdd-48ea-1158-fff8c6ce091d',
          //   type: 'arrow',
          //   fromId: '34736c43-059f-4a6f-2831-a0079823415c',
          //   toId: '932a3f1a-bd52-463e-062c-36aa675e210c',
          //   handleId: 'start',
          //   point: [0.5, 0.5],
          //   distance: 16,
          // },
          // '312798e5-08e1-4f6f-02b6-42dea73e3aa4': {
          //   id: '312798e5-08e1-4f6f-02b6-42dea73e3aa4',
          //   type: 'arrow',
          //   fromId: '34736c43-059f-4a6f-2831-a0079823415c',
          //   toId: 'c7b47e05-3889-432e-2876-54a5a0f07cc2',
          //   handleId: 'end',
          //   point: [0.64, 0.31],
          //   distance: 16,
          // },
        },
      },
      assets: {
        liveblocksType: 'LiveMap',
        data: {},
      },
    },
  }

  const currentPage = Object.keys(document.pages)[0]

  requestBody.data.shapes.data = document.pages[currentPage].shapes ?? {}
  requestBody.data.bindings.data = document.pages[currentPage].bindings ?? {}
  requestBody.data.assets.data = document.assets ?? {}

  const roomId = nanoid()

  const auth = await fetch('https://liveblocks.io/api/authorize', {
    headers: {
      Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  }).then((d) => d.json())

  // GET

  // const result = await fetch(`https://liveblocks.net/api/v1/room/1652883688619/storage`, {
  //   method: 'GET',
  //   headers: {
  //     Authorization: `Bearer ${auth.token}`,
  //     'Content-Type': 'application/json',
  //   },
  // }).then((d) => d.json())

  // POST

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

  res.end({ status: 'error' })
}
