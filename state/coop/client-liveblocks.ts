import { Client, Room, createClient } from '@liveblocks/client'
import coopState from './coop-state'
import { CoopPresence } from 'types'
import {
  ConnectionCallback,
  MyPresenceCallback,
  OthersEventCallback,
} from '@liveblocks/client/lib/cjs/types'
import { uniqueId } from 'utils/utils'

class CoopClient {
  id = uniqueId()
  roomId: string
  lastCursorEventTime = 0
  client: Client
  room: Room
  bufferedXs: number[] = []
  bufferedYs: number[] = []
  bufferedTs: number[] = []

  constructor() {
    this.client = createClient({
      authEndpoint: '/api/auth-liveblocks',
    })
  }

  private handleConnectionEvent: ConnectionCallback = (status) => {
    coopState.send('CHANGED_CONNECTION_STATUS', { status })
  }

  private handleMyPresenceEvent: MyPresenceCallback<CoopPresence> = () => {
    null
  }

  private handleOthersEvent: OthersEventCallback<CoopPresence> = (_, event) => {
    switch (event.type) {
      case 'enter': {
        coopState.send('OTHER_USER_ENTERED', event)
        break
      }
      case 'leave': {
        coopState.send('OTHER_USER_LEFT', event)
        break
      }
      case 'update': {
        coopState.send('OTHER_USER_UPDATED', event)
        break
      }
      case 'reset': {
        coopState.send('RESET_OTHER_USERS', event)
        break
      }
    }
  }

  connect(roomId: string): CoopClient {
    if (this.roomId) {
      this.client.leave(this.roomId)
    }

    this.roomId = roomId

    this.room = this.client.enter(roomId, { cursor: null })
    this.room.subscribe('connection', this.handleConnectionEvent)
    this.room.subscribe('my-presence', this.handleMyPresenceEvent)
    this.room.subscribe('others', this.handleOthersEvent)

    coopState.send('JOINED_ROOM', { others: this.room.getOthers().toArray() })
    return this
  }

  disconnect(): CoopClient {
    this.room.unsubscribe('connection', this.handleConnectionEvent)
    this.room.unsubscribe('my-presence', this.handleMyPresenceEvent)
    this.room.unsubscribe('others', this.handleOthersEvent)

    this.client.leave(this.roomId)
    return this
  }

  reconnect(): CoopClient {
    this.connect(this.roomId)
    return this
  }

  moveCursor(pageId: string, point: number[]): CoopClient {
    if (!this.room) return

    const now = Date.now()
    let elapsed = now - this.lastCursorEventTime

    if (elapsed > 200) {
      // The animation's total duration (in seconds)
      const duration = this.bufferedTs[this.bufferedTs.length - 1]

      // Normalized times (0 - 1)
      const times = this.bufferedTs.map((t) => t / duration)

      // Make sure the array includes both a 0 and a 1
      if (times.length === 1) {
        this.bufferedXs.unshift(this.bufferedXs[0])
        this.bufferedYs.unshift(this.bufferedYs[0])
        times.unshift(0)
      }

      // Send the event to the service
      this.room.updatePresence<CoopPresence>({
        bufferedXs: this.bufferedXs,
        bufferedYs: this.bufferedYs,
        times,
        duration,
        pageId,
      })

      // Reset data for next update
      this.lastCursorEventTime = now
      this.bufferedXs = []
      this.bufferedYs = []
      this.bufferedTs = []
      elapsed = 0
    }

    // Add the new point and time
    this.bufferedXs.push(point[0])
    this.bufferedYs.push(point[1])
    this.bufferedTs.push(elapsed / 1000)
    return this
  }

  clearCursor(): CoopClient {
    this.room.updatePresence({ cursor: null })
    return this
  }
}

export default CoopClient
