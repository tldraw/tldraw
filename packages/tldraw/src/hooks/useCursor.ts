import React, { RefObject } from 'react'

export function useCursor(ref: RefObject<HTMLDivElement>) {
  React.useEffect(() => {
    let isPointing = false
    let isSpacePanning = false

    const elm = ref.current
    if (!elm) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isSpacePanning) {
        isSpacePanning = true

        if (isPointing) {
          elm.setAttribute('style', 'cursor: grabbing !important')
        } else {
          elm.setAttribute('style', 'cursor: grab !important')
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isSpacePanning = false
        elm.setAttribute('style', 'cursor: initial')
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      isPointing = true

      // On middle mouse down
      if (e.button === 1) {
        elm.setAttribute('style', 'cursor: grabbing !important')
      }

      // On left mouse down
      if (e.button === 0) {
        if (isSpacePanning) {
          elm.setAttribute('style', 'cursor: grabbing !important')
        }
      }
    }

    const onPointerUp = () => {
      isPointing = false

      if (isSpacePanning) {
        elm.setAttribute('style', 'cursor: grab !important')
      } else {
        elm.setAttribute('style', 'cursor: initial')
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
