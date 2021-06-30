import { createSelectorHook, createState } from '@state-designer/react'
import { CoopPresence } from 'types'
import { User } from '@liveblocks/client'
import client from 'state/coop/client-liveblocks'

type ConnectionState =
  | 'closed'
  | 'authenticating'
  | 'unavailable'
  | 'failed'
  | 'open'
  | 'connecting'

const coopState = createState({
  data: {
    status: 'closed' as ConnectionState,
    others: {} as Record<string, User<CoopPresence>>,
  },
  on: {
    JOINED_ROOM: 'setOthers',
    LEFT_ROOM: 'disconnectFromRoom',
    CHANGED_CONNECTION_STATUS: 'setStatus',
    OTHER_USER_ENTERED: 'addOtherUser',
    OTHER_USER_LEFT: 'removeOtherUser',
    OTHER_USER_UPDATED: 'updateOtherUser',
    RESET_OTHER_USERS: 'resetOtherUsers',
  },
  actions: {
    connectToRoom(data, payload: { id: string }) {
      client.connect(payload.id)
    },
    disconnectFromRoom() {
      client.disconnect()
    },
    setStatus(data, payload: { status: ConnectionState }) {
      data.status = payload.status
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
