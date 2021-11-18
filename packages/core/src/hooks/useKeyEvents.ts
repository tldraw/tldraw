import { useTLContext } from '~hooks'
import * as React from 'react'

export function useKeyEvents() {
  const { inputs, callbacks } = useTLContext()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      callbacks.onKeyDown?.(e.key, inputs.keydown(e), e)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      inputs.keyup(e)
      callbacks.onKeyUp?.(e.key, inputs.keyup(e), e)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [inputs, callbacks])
}
