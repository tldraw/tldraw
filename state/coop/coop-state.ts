import { createSelectorHook, createState } from '@state-designer/react'
import { CoopPresence } from 'types'
import { User } from '@liveblocks/client'
import CoopClient from 'state/coop/client-liveblocks'

type ConnectionState =
  | 'closed'
  | 'authenticating'
  | 'unavailable'
  | 'failed'
  | 'open'
  | 'connecting'

const coopState = createState({
  data: {
    client: undefined as CoopClient | undefined,
    status: 'closed' as ConnectionState,
    others: {} as Record<string, User<CoopPresence>>,
  },
  initial: 'offline',
  states: {
    offline: {
      on: {
        JOINED_ROOM: { to: 'online' },
      },
    },
    online: {
      onEnter: ['createClient', 'setOthers'],
      on: {
        MOVED_CURSOR: 'updateCursor',
        JOINED_ROOM: 'setOthers',
        CHANGED_CONNECTION_STATUS: 'setStatus',
        OTHER_USER_ENTERED: 'addOtherUser',
        OTHER_USER_LEFT: 'removeOtherUser',
        OTHER_USER_UPDATED: 'updateOtherUser',
        RESET_OTHER_USERS: 'resetOtherUsers',
        LEFT_ROOM: 'disconnectFromRoom',
      },
    },
  },
  conditions: {
    hasClient(data) {
      return data.client !== undefined
    },
  },
  actions: {
    createClient(data) {
      data.client = new CoopClient()
    },
    connectToRoom(data, payload: { id: string }) {
      data.client.connect(payload.id)
    },
    disconnectFromRoom(data) {
      data.client.disconnect()
    },
    updateCursor(data, payload: { pageId: string; point: number[] }) {
      data.client.moveCursor(payload.pageId, payload.point)
    },
    setStatus(data, payload: { status: ConnectionState }) {
      data.status = payload?.status
    },
    setOthers(data, payload: { others: User<CoopPresence>[] }) {
      const { others } = payload
      data.others = Object.fromEntries(
        others.map((user) => [user.connectionId, user])
      )
    },
    addOtherUser(data, payload: { user: User<CoopPresence> }) {
      const { user } = payload
      data.others[user.connectionId] = user
    },
    removeOtherUser(data, payload: { user: User<CoopPresence> }) {
      const { user } = payload
      delete data.others[user.connectionId]
    },
    updateOtherUser(data, payload: { user: User<CoopPresence>; changes: any }) {
      const { user } = payload
      data.others[user.connectionId] = user
    },
    resetOtherUsers(data) {
      data.others = {}
    },
  },
})

export const useCoopSelector = createSelectorHook(coopState)

export default coopState
