import * as React from 'react'

export function useForceUpdate() {
  const forceUpdate = React.useReducer((s) => s + 1, 0)
  React.useLayoutEffect(() => forceUpdate[1](), [])
}
