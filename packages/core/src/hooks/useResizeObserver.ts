import { useTLContext } from '+hooks'
import * as React from 'react'
import { Utils } from '+utils'

export function useResizeObserver<T extends HTMLElement | SVGElement>(ref: React.RefObject<T>) {
  const { inputs } = useTLContext()

  const updateOffsets = React.useCallback(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) {
      inputs.offset = [rect.left, rect.top]
      inputs.size = [rect.width, rect.height]
    }
  }, [ref])

  React.useEffect(() => {
    const debouncedUpdateOffsets = Utils.debounce(updateOffsets, 100)
    window.addEventListener('scroll', debouncedUpdateOffsets)
    window.addEventListener('resize', debouncedUpdateOffsets)
    updateOffsets()
    return () => {
      window.removeEventListener('scroll', debouncedUpdateOffsets)
      window.removeEventListener('resize', debouncedUpdateOffsets)
    }
  }, [inputs])

  React.useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (inputs.isPinching) {
        return
      }

      if (entries[0].contentRect) {
        updateOffsets()
      }
    })

    if (ref.current) {
      resizeObserver.observe(ref.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [ref, inputs])

  React.useEffect(() => {
    setTimeout(() => {
      updateOffsets()
    })
  }, [ref])
}
