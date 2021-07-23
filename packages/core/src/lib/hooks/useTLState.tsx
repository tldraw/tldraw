import * as React from 'react'
import { TLContext } from '../renderer'

export function useTLState() {
  const state = React.useContext(TLContext)

  return state
}
