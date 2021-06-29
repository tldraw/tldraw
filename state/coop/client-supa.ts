/* eslint-disable no-console */
import state from 'state/state'
// import { Shape } from 'types'
import { RealtimeClient, RealtimeSubscription } from '@supabase/realtime-js'

class RoomClient {
  id: string
  roomId: string
  client: RealtimeClient
  channel: RealtimeSubscription
  lastCursorEventTime = 0

  constructor() {
    // Create client
    this.client = new RealtimeClient(
      'https://mntnflsepfmpvthazvvu.supabase.com'
    )

    // Set event listeners
    this.client.onOpen(() =>
      state.send('RT_CHANGED_STATUS', { status: 'Socket opened.' })
    )

    this.client.onClose(() =>
      state.send('RT_CHANGED_STATUS', { status: 'Socket closed.' })
    )

    this.client.onError((e: Error) =>
      state.send('RT_CHANGED_STATUS', { status: `Socket error: ${e.message}` })
    )

    // Connect to client
    this.client.connect()
  }

  connect(roomId: string) {
    this.roomId = roomId

    // Unsubscribe from any existing channel

    if (this.channel !== undefined) {
      this.channel.unsubscribe()
      delete this.channel
    }

    // Create a new channel for this room id

    this.channel = this.client.channel(`realtime:public:${this.roomId}`)
    this.channel.on('*', (e: any) => console.log(e))
    this.channel.on('INSERT', (e: any) => console.log(e))
    this.channel.on('UPDATE', (e: any) => console.log(e))
    this.channel.on('DELETE', (e: any) => console.log(e))

    // Subscribe to the channel
    this.channel
      .subscribe()
      .receive('ok', () => console.log('Connected.'))
      .receive('error', () => console.log('Failed.'))
      .receive('timeout', () => console.log('Timed out, retrying.'))

    // Old

    // this.channel = this.pusher.subscribe(
    //   this.room
    // ) as PusherTypes.PresenceChannel

    // this.channel.bind('pusher:subscription_error', (err: string) => {
    //   console.warn(err)
    //   state.send('RT_CHANGED_STATUS', { status: 'subscription-error' })
    // })

    // this.channel.bind('pusher:subscription_succeeded', () => {
    //   const me = this.channel.members.me
    //   const userId = me.id

    //   this.id = userId

    //   state.send('RT_CHANGED_STATUS', { status: 'subscribed' })
    // })

    // this.channel.bind(
    //   'created_shape',
    //   (payload: { id: string; pageId: string; shape: Shape }) => {
    //     if (payload.id === this.id) return
    //     state.send('RT_CREATED_SHAPE', payload)
    //   }
    // )

    // this.channel.bind(
    //   'deleted_shape',
    //   (payload: { id: string; pageId: string; shape: Shape }) => {
    //     if (payload.id === this.id) return
    //     state.send('RT_DELETED_SHAPE', payload)
    //   }
    // )

    // this.channel.bind(
    //   'edited_shape',
    //   (payload: { id: string; pageId: string; change: Partial<Shape> }) => {
    //     if (payload.id === this.id) return
    //     state.send('RT_EDITED_SHAPE', payload)
    //   }
    // )

    // this.channel.bind(
    //   'client-moved-cursor',
    //   (payload: { id: string; pageId: string; point: number[] }) => {
    //     if (payload.id === this.id) return
    //     state.send('RT_MOVED_CURSOR', payload)
    //   }
    // )
  }

  disconnect() {
    this.channel.unsubscribe()
    this.client.disconnect()
  }

  reconnect() {
    this.connect(this.roomId)
  }

  moveCursor(pageId: string, point: number[]) {
    if (!this.channel) return

    const now = Date.now()

    if (now - this.lastCursorEventTime > 200) {
      this.lastCursorEventTime = now

      this.channel?.trigger('client-moved-cursor', {
        id: this.id,
        pageId,
        point,
      })
    }
  }
}

export default new RoomClient()
