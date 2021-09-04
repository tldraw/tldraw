import * as React from 'react'
import Utils from '+utils'

export function useRenderOnResize() {
  const forceUpdate = React.useReducer((x) => x + 1, 0)[1]

  React.useEffect(() => {
    const debouncedUpdate = Utils.debounce(forceUpdate, 96)
    window.addEventListener('resize', debouncedUpdate)
    return () => {
      window.removeEventListener('resize', debouncedUpdate)
    }
  }, [forceUpdate])
}
