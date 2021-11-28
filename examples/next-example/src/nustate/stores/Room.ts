// import { Utils } from '@tldraw/core'
// import type { TDPage, TDUser } from '~types'
// import { action, makeAutoObservable } from 'mobx'

// interface TDRoom {
//   id: string
//   userId: string
//   users: Record<string, TDUser>
// }

// export class Room implements TDRoom {
//   id
//   userId
//   users

//   constructor(opts = {} as Partial<TDRoom>) {
//     const { id, userId, users } = { ...opts, ...Room.defaultProps }
//     this.id = id
//     this.userId = userId
//     this.users = users
//     makeAutoObservable(this)
//   }

//   @action update = (change: Partial<TDRoom>) => {
//     Object.assign(this, change)
//   }

//   static defaultProps: TDRoom = {
//     id: Utils.uniqueId(),
//     userId: Utils.uniqueId(),
//     users: {},
//   }
// }
