import React, { RefObject } from 'react'

export function useCursor(ref: RefObject<HTMLDivElement>) {
  React.useEffect(() => {
    let isPointing = false
    let isPanning = false

    const elm = ref.current
    if (!elm) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key == ' ') {
        isPanning = true
        if (isPointing) {
          elm.setAttribute('style', 'cursor: grabbing !important')
        } else {
          elm.setAttribute('style', 'cursor: grab !important')
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key == ' ') {
        isPanning = false
        elm.setAttribute('style', 'cursor: initial')
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      console.log('hi', e.button)
      if (e.button === 0) {
        isPointing = true
        if (isPanning) {
          elm.setAttribute('style', 'cursor: grabbing !important')
        }
      }
    }

    const onPointerUp = () => {
      isPointing = false
      if (isPanning) {
        elm.setAttribute('style', 'cursor: grab !important')
      }
    }

    elm.addEventListener('keydown', onKeyDown)
    elm.addEventListener('keyup', onKeyUp)
    elm.addEventListener('pointerdown', onPointerDown)
    elm.addEventListener('pointerup', onPointerUp)

    return () => {
      elm.removeEventListener('keydown', onKeyDown)
      elm.removeEventListener('keyup', onKeyUp)
      elm.removeEventListener('pointerdown', onPointerDown)
      elm.removeEventListener('pointerup', onPointerUp)
    }
  }, [ref.current])
}
