import * as React from 'react'
import { CursorComponent } from '~components/Cursor'
import type { TLUser } from '~types'

interface UserProps {
  user: TLUser
  Cursor: CursorComponent
}

export function User({ user, Cursor }: UserProps) {
  const rCursor = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    if (rCursor.current) {
      rCursor.current.style.transform = `translate(${user.point[0]}px, ${user.point[1]}px)`
    }
  }, [user.point])

  return (
    <div
      ref={rCursor}
      className={`tl-absolute tl-user tl-counter-scaled ${user.session ? '' : 'tl-animated'}`}
    >
      <Cursor id={user.id} color={user.color} metadata={user.metadata} />
    </div>
  )
}
