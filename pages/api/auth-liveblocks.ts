import { authorize } from '@liveblocks/node'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY

const Auth: NextApiHandler = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (!API_KEY) {
    return res.status(403).end()
  }

  const room = req.body.room

  if (room === 'example-live-cursors-avatars') {
    const response = await authorize({
      room,
      secret: API_KEY,
      userInfo: {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        picture: `/assets/avatars/${Math.floor(Math.random() * 10)}.png`,
      },
    })

    return res.status(response.status).end(response.body)
  }

  const response = await authorize({
    room,
    secret: API_KEY,
  })

  return res.status(response.status).end(response.body)
}

export default Auth

const NAMES = [
  'Charlie Layne',
  'Mislav Abha',
  'Tatum Paolo',
  'Anjali Wanda',
  'Jody Hekla',
  'Emil Joyce',
  'Jory Quispe',
  'Quinn Elton',
]
