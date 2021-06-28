import Pusher from 'pusher-js'
import * as PusherTypes from 'pusher-js'
import state from 'state/state'
import { Shape } from 'types'
import { v4 as uuid } from 'uuid'

class RoomClient {
  room: string
  pusher: Pusher
  channel: PusherTypes.Channel
  lastCursorEventTime = 0
  id = uuid()

  constructor() {
    // Create pusher instance and bind events

    this.pusher = new Pusher('5dc87c88b8684bda655a', { cluster: 'eu' })

    this.pusher.connection.bind('connecting', () =>
      state.send('RT_CHANGED_STATUS', { status: 'connecting' })
    )

    this.pusher.connection.bind('connected', () =>
      state.send('RT_CHANGED_STATUS', { status: 'connected' })
    )

    this.pusher.connection.bind('unavailable', () =>
      state.send('RT_CHANGED_STATUS', { status: 'unavailable' })
    )

    this.pusher.connection.bind('failed', () =>
      state.send('RT_CHANGED_STATUS', { status: 'failed' })
    )

    this.pusher.connection.bind('disconnected', () =>
      state.send('RT_CHANGED_STATUS', { status: 'disconnected' })
    )
  }

  connect(room: string) {
    this.room = room

    // Subscribe to channel

    this.channel = this.pusher.subscribe(this.room)

    this.channel.bind('pusher:subscription_error', () => {
      state.send('RT_CHANGED_STATUS', { status: 'subscription-error' })
    })

    this.channel.bind('pusher:subscription_succeeded', () => {
      state.send('RT_CHANGED_STATUS', { status: 'subscribed' })
    })

    this.channel.bind(
      'created_shape',
      (payload: { id: string; pageId: string; shape: Shape }) => {
        state.send('RT_CREATED_SHAPE', payload)
      }
    )

    this.channel.bind(
      'deleted_shape',
      (payload: { id: string; pageId: string; shape: Shape }) => {
        state.send('RT_DELETED_SHAPE', payload)
      }
    )

    this.channel.bind(
      'edited_shape',
      (payload: { id: string; pageId: string; change: Partial<Shape> }) => {
        state.send('RT_EDITED_SHAPE', payload)
      }
    )

    this.channel.bind(
      'moved_cursor',
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

    if (now - this.lastCursorEventTime > 42) {
      this.lastCursorEventTime = now

      this.channel?.trigger('RT_MOVED_CURSOR', {
        id: this.id,
        pageId,
        point,
      })
    }
  }
}

export default new RoomClient()
