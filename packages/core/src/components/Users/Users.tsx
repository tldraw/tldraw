import * as React from 'react'
import { CursorComponent } from '~components/Cursor'
import { User } from '~components/User/User'
import type { TLUsers } from '~types'

export interface UserProps {
  userId?: string
  users: TLUsers
  Cursor: CursorComponent
}

export function Users({ userId, users, Cursor }: UserProps) {
  return (
    <>
      {Object.values(users)
        .filter((user) => user && user.id !== userId)
        .map((user) => (
          <User key={user.id} user={user} Cursor={Cursor} />
        ))}
    </>
  )
}
