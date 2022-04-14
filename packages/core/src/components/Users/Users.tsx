import * as React from 'react'
import { User } from '~components/User/User'
import { UserTag } from '~components/UserTag/UserTag'
import type { TLShape, TLUsers } from '~types'

export interface UserProps {
  userId?: string
  users: TLUsers<TLShape>
}

export function Users({ userId, users }: UserProps) {
  return (
    <>
      {Object.values(users)
        .filter((user) => user && user.id !== userId)
        .map((user) => (
          <>
            <User key={user.id} user={user} />
            {user.name && <UserTag key={user.id} user={user} />}
          </>
        ))}
    </>
  )
}
