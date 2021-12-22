/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Vec from '@tldraw/vec'
import * as React from 'react'
import { useCursorAnimation } from '~hooks'
import type { TLShape, TLUser } from '~types'

interface UserProps {
  user: TLUser<TLShape>
}

export function User({ user }: UserProps) {
  const rCursor = React.useRef<HTMLDivElement>(null)
  useCursorAnimation(rCursor, user.point)
  return (
    <div
      ref={rCursor}
      className="tl-absolute tl-user"
      style={{
        backgroundColor: user.color,
        willChange: 'transform',
      }}
    />
  )
}
