import Vec from '@tldraw/vec'
import * as React from 'react'
import type { TLShape, TLUser } from '~types'

interface UserProps {
  user: TLUser<TLShape>
}

export function User({ user }: UserProps) {
  const rUser = React.useRef<HTMLDivElement>(null)
  const rPoint = React.useRef(user.point)
  const rLastTime = React.useRef(Date.now())

  React.useEffect(() => {
    // const now = Date.now()
    // const elapsed = Math.max(Date.now() - rLastTime.current, 80)
    const frames = 8 // Math.floor(elapsed / 16)
    const elm = rUser.current
    if (!elm) return
    let endEarly = false
    const prevPoint = [...rPoint.current]
    let frame = 0
    function loop() {
      if (endEarly) return
      const t = frame / frames
      if (t > 1) return
      const elm = rUser.current
      if (!elm) return
      const point = Vec.lrp(prevPoint, user.point, t)
      elm.style.setProperty('transform', `translate(${point[0]}px, ${point[1]}px)`)
      frame++
      requestAnimationFrame(loop)
    }
    loop()
    rPoint.current = user.point
    // rLastTime.current = now
    return () => {
      endEarly = true
    }
  }, [user.point])

  return (
    <div
      ref={rUser}
      className="tl-absolute tl-user"
      style={{
        backgroundColor: user.color,
        willChange: 'transform',
      }}
    />
  )
}
