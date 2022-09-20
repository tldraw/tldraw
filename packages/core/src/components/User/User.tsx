import * as React from 'react'
import { CursorComponent, DefaultCursor } from '~components/Cursor/Cursor'
import type { TLShape, TLUser } from '~types'

interface UserProps {
  user: TLUser<TLShape>
  Cursor?: CursorComponent
}

export function User({ user, Cursor = DefaultCursor }: UserProps) {
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
      <Cursor color={user.color} />
    </div>
  )
}
