import * as React from 'react'
import type { TLUser } from '+types'

interface UserProps {
  user: TLUser
}

export function User({ user }: UserProps) {
  const rUser = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={rUser}
      className="tl-absolute tl-user"
      style={{
        backgroundColor: user.color,
        transform: `translate(${user.point[0]}px, ${user.point[1]}px)`,
      }}
    />
  )
}
