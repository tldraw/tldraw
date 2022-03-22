import Vec from '@tlslides/vec'
import * as React from 'react'

type AnimationState = 'stopped' | 'idle' | 'animating'

type Animation = {
  curve: boolean
  from: number[]
  to: number[]
  start: number
  distance: number
  timeStamp: number
  duration: number
}

export function useCursorAnimation(ref: any, point: number[]) {
  const rState = React.useRef<AnimationState>('idle')
  const rPrevPoint = React.useRef(point)
  const rQueue = React.useRef<Animation[]>([])
  const rTimestamp = React.useRef(performance.now())
  const rLastRequestId = React.useRef<any>(0)
  const rTimeoutId = React.useRef<any>(0)
  const [spline] = React.useState(() => new Spline())

  // Animate an animation
  const animateNext = React.useCallback(
    (animation: Animation) => {
      const start = performance.now()
      function loop() {
        const t = (performance.now() - start) / animation.duration
        if (t <= 1) {
          const elm = ref.current
          if (!elm) return
          const point = animation.curve
            ? spline.getSplinePoint(t + animation.start)
            : Vec.lrp(animation.from, animation.to, t)
          elm.style.setProperty('transform', `translate(${point[0]}px, ${point[1]}px)`)
          rLastRequestId.current = requestAnimationFrame(loop)
          return
        }
        const next = rQueue.current.shift()
        if (next) {
          rState.current = 'animating'
          animateNext(next)
        } else {
          rState.current = 'idle'
          rTimeoutId.current = setTimeout(() => {
            rState.current = 'stopped'
          }, 250)
        }
      }
      loop()
    },
    [spline]
  )

  // When the point changes, add a new animation
  React.useLayoutEffect(() => {
    const now = performance.now()
    if (rState.current === 'stopped') {
      rTimestamp.current = now
      rPrevPoint.current = point
      spline.clear()
    }
    spline.addPoint(point)
    const animation: Animation = {
      distance: spline.totalLength,
      curve: spline.points.length > 3,
      start: spline.points.length - 3,
      from: rPrevPoint.current,
      to: point,
      timeStamp: now,
      duration: Math.min(now - rTimestamp.current, 300),
    }
    rPrevPoint.current = point
    rTimestamp.current = now
    switch (rState.current) {
      case 'stopped': {
        rPrevPoint.current = point
        rState.current = 'idle'
        break
      }
      case 'idle': {
        rState.current = 'animating'
        animateNext(animation)
        break
      }
      case 'animating': {
        rQueue.current.push(animation)
        break
      }
    }
    return () => clearTimeout(rTimeoutId.current)
  }, [point, spline])
}

class Spline {
  points: number[][] = []
  lengths: number[] = []
  totalLength = 0

  private prev?: number[]

  addPoint(point: number[]) {
    if (this.prev) {
      const length = Vec.dist(this.prev, point)
      this.lengths.push(length)
      this.totalLength += length
      this.points.push(point)
    }
    this.prev = point
  }

  getSplinePoint(t: number): number[] {
    const { points } = this
    const l = points.length - 1
    const d = Math.trunc(t)
    const p1 = Math.min(d + 1, l)
    const p2 = Math.min(p1 + 1, l)
    const p3 = Math.min(p2 + 1, l)
    const p0 = p1 - 1
    t = t - d
    const tt = t * t,
      ttt = tt * t,
      q1 = -ttt + 2 * tt - t,
      q2 = 3 * ttt - 5 * tt + 2,
      q3 = -3 * ttt + 4 * tt + t,
      q4 = ttt - tt
    return [
      0.5 * (points[p0][0] * q1 + points[p1][0] * q2 + points[p2][0] * q3 + points[p3][0] * q4),
      0.5 * (points[p0][1] * q1 + points[p1][1] * q2 + points[p2][1] * q3 + points[p3][1] * q4),
    ]
  }

  clear() {
    this.points = []
    this.totalLength = 0
  }
}
