import { NextApiHandler } from 'next'
import Pusher from 'pusher'
import { v4 as uuid } from 'uuid'

const pusher = new Pusher({
  key: '5dc87c88b8684bda655a',
  appId: '1226484',
  secret: process.env.PUSHER_SECRET,
  cluster: 'eu',
})

const PusherAuth: NextApiHandler = (req, res) => {
  try {
    const { socket_id, channel_name } = req.body

    const presenceData = {
      user_id: uuid(),
      user_info: { name: 'Anonymous' },
    }

    const auth = pusher.authenticate(
      socket_id.toString(),
      channel_name.toString(),
      presenceData
    )

    return res.send(auth)
  } catch (err) {
    res.status(403).end()
  }
}

export default PusherAuth
