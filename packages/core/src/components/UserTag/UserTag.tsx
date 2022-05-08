/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Vec from '@tldraw/vec'
import * as React from 'react'
import { useCursorAnimation } from '~hooks'
import type { TLShape, TLUser } from '~types'

interface UserProps {
  user: TLUser<TLShape>
}

export function UserTag({ user }: UserProps) {
  const rTag = React.useRef<HTMLParagraphElement>(null)
  useCursorAnimation(rTag, user.point)

  return (
    <p ref={rTag} className="tl-counter-scaled tl-user-tag" style={{ backgroundColor: user.color }}>
      {user.name}
    </p>
  )
}
