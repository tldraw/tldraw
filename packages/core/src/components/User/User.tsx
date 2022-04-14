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

  React.useLayoutEffect(() => {
    rCursor.current!.style.setProperty('--tl-userColor', user.color)
  }, [])

  return (
    <div ref={rCursor}>
      <svg
        className="tl-absolute tl-user tl-counter-scaled"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 35 35"
        fill="none"
        fillRule="evenodd"
      >
        <g fill="rgba(0,0,0,.2)" transform="translate(1,1)">
          <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
          <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
        </g>
        <g fill="white">
          <path d="m12 24.4219v-16.015l11.591 11.619h-6.781l-.411.124z" />
          <path d="m21.0845 25.0962-3.605 1.535-4.682-11.089 3.686-1.553z" />
        </g>
        <g fill={user.color}>
          <path d="m19.751 24.4155-1.844.774-3.1-7.374 1.841-.775z" />
          <path d="m13 10.814v11.188l2.969-2.866.428-.139h4.768z" />
        </g>
      </svg>
      {user.name && <p className="tl-user-tag">{user.name}</p>}
    </div>
  )
}
