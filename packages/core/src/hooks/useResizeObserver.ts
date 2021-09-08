import { useTLContext } from '+hooks'
import * as React from 'react'

export function useResizeObserver<T extends HTMLElement | SVGElement>(ref: React.RefObject<T>) {
  const { inputs } = useTLContext()

  React.useEffect(() => {
    function handleScroll() {
      const rect = ref.current?.getBoundingClientRect()
      if (rect) {
        inputs.offset = [rect.left, rect.top]
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [inputs])

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (inputs.isPinching) return

      if (entries[0].contentRect) {
        const rect = ref.current?.getBoundingClientRect()
        if (rect) {
          inputs.offset = [rect.left, rect.top]
        }
      }
    })

    if (ref.current) {
      resizeObserver.observe(ref.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [ref, inputs])
}
