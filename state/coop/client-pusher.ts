import Pusher from 'pusher-js'
import * as PusherTypes from 'pusher-js'
import state from 'state/state'
import { Shape } from 'types'

class RoomClient {
  room: string
  pusher: Pusher
  channel: PusherTypes.PresenceChannel
  lastCursorEventTime = 0
  id: string

  constructor() {
    // Create pusher instance and bind events

    this.pusher = new Pusher('5dc87c88b8684bda655a', {
      cluster: 'eu',
      authEndpoint: 'http://localhost:3000/api/pusher-auth',
    })

    this.pusher.connection.bind('connecting', () =>
      state.send('RT_CHANGED_STATUS', { status: 'connecting' })
    )

    this.pusher.connection.bind('connected', () =>
      state.send('RT_CHANGED_STATUS', { status: 'connected' })
    )

    this.pusher.connection.bind('unavailable', () =>
      state.send('RT_CHANGED_STATUS', { status: 'unavailable' })
    )

    this.pusher.connection.bind('failed', () => {
      state.send('RT_CHANGED_STATUS', { status: 'failed' })
    })

    this.pusher.connection.bind('disconnected', () => {
      state.send('RT_CHANGED_STATUS', { status: 'disconnected' })
    })
  }

  connect(roomId: string) {
    this.room = 'presence-' + roomId

    // Subscribe to channel

    this.channel = this.pusher.subscribe(
      this.room
    ) as PusherTypes.PresenceChannel

    this.channel.bind('pusher:subscription_error', (err: string) => {
      console.warn(err)
      state.send('RT_CHANGED_STATUS', { status: 'subscription-error' })
    })

    this.channel.bind('pusher:subscription_succeeded', () => {
      const me = this.channel.members.me
      const userId = me.id

      this.id = userId

      state.send('RT_CHANGED_STATUS', { status: 'subscribed' })
    })

    this.channel.bind(
      'created_shape',
      (payload: { id: string; pageId: string; shape: Shape }) => {
        if (payload.id === this.id) return
        state.send('RT_CREATED_SHAPE', payload)
      }
    )

    this.channel.bind(
      'deleted_shape',
      (payload: { id: string; pageId: string; shape: Shape }) => {
        if (payload.id === this.id) return
        state.send('RT_DELETED_SHAPE', payload)
      }
    )

    this.channel.bind(
      'edited_shape',
      (payload: { id: string; pageId: string; change: Partial<Shape> }) => {
        if (payload.id === this.id) return
        state.send('RT_EDITED_SHAPE', payload)
      }
    )

    this.channel.bind(
      'client-moved-cursor',
      (payload: { id: string; pageId: string; point: number[] }) => {
        if (payload.id === this.id) return
        state.send('RT_MOVED_CURSOR', payload)
      }
    )
  }

  disconnect() {
    this.pusher.unsubscribe(this.room)
  }

  reconnect() {
    this.pusher.subscribe(this.room)
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
