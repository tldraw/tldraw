import { MoveType } from '@tldraw/core'
import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '../shape'
import { state } from '../state'

export function useKeyboardShortcuts() {
  useHotkeys('command+z', (e) => {
    state.send('UNDO')
    e.preventDefault()
  })

  useHotkeys('ctrl+shift-z,command+shift+z', (e) => {
    state.send('REDO')
    e.preventDefault()
  })

  useHotkeys('ctrl+d,command+d', (e) => {
    state.send('DUPLICATED')
    e.preventDefault()
  })

  useHotkeys('ctrl+s,command+s', (e) => {
    state.send('SAVED')
    e.preventDefault()
  })

  useHotkeys('ctrl+=,command+=', (e) => {
    state.send('ZOOMED_IN')
    e.preventDefault()
  })

  useHotkeys('ctrl+-,command+-', (e) => {
    state.send('ZOOMED_OUT')
    e.preventDefault()
  })

  useHotkeys('shift+1', (e) => {
    state.send('ZOOMED_TO_FIT')
    e.preventDefault()
  })

  useHotkeys('shift+2', (e) => {
    state.send('ZOOMED_TO_SELECTION')
    e.preventDefault()
  })

  useHotkeys('shift+0', (e) => {
    state.send('ZOOMED_TO_ACTUAL')
    e.preventDefault()
  })

  useHotkeys('escape', (e) => {
    state.send('CANCELLED')
    e.preventDefault()
  })

  useHotkeys('backspace', (e) => {
    state.send('DELETED')
    e.preventDefault()
  })

  useHotkeys('command+a,ctrl+a', (e) => {
    state.send('SELECTED_ALL')
    e.preventDefault()
  })

  useHotkeys('up', (e) => {
    state.send('NUDGED', { delta: [0, -1], major: false })
    e.preventDefault()
  })

  useHotkeys('right', (e) => {
    state.send('NUDGED', { delta: [1, 0], major: false })
    e.preventDefault()
  })

  useHotkeys('down', (e) => {
    state.send('NUDGED', { delta: [0, 1], major: false })
    e.preventDefault()
  })

  useHotkeys('left', (e) => {
    state.send('NUDGED', { delta: [-1, 0], major: false })
    e.preventDefault()
  })

  useHotkeys('shift+up', (e) => {
    state.send('NUDGED', { delta: [0, -1], major: true })
    e.preventDefault()
  })

  useHotkeys('shift+right', (e) => {
    state.send('NUDGED', { delta: [1, 0], major: true })
    e.preventDefault()
  })

  useHotkeys('shift+down', (e) => {
    state.send('NUDGED', { delta: [0, 1], major: true })
    e.preventDefault()
  })

  useHotkeys('shift+left', (e) => {
    state.send('NUDGED', { delta: [-1, 0], major: true })
    e.preventDefault()
  })

  useHotkeys('[', (e) => {
    state.send('MOVED', { type: MoveType.Backward })
    e.preventDefault()
  })

  useHotkeys(']', (e) => {
    state.send('MOVED', { type: MoveType.Forward })
    e.preventDefault()
  })

  useHotkeys('shift+[', (e) => {
    state.send('MOVED', { type: MoveType.ToBack })
    e.preventDefault()
  })

  useHotkeys('shift+]', (e) => {
    state.send('MOVED', { type: MoveType.ToFront })
    e.preventDefault()
  })

  useHotkeys('v,1', (e) => {
    state.send('SELECTED_TOOL', { type: 'select' })
    e.preventDefault()
  })

  useHotkeys('r,3', (e) => {
    state.send('SELECTED_TOOL', { type: TLDrawShapeType.Rectangle })
    e.preventDefault()
  })

  useHotkeys('e,4', (e) => {
    state.send('SELECTED_TOOL', { type: TLDrawShapeType.Ellipse })
    e.preventDefault()
  })

  // function handleKeyDown(e: KeyboardEvent) {
  //   switch (e.key) {
  //     case '‘': {
  //       e.preventDefault()
  //       break
  //     }
  //     case '“': {
  //       e.preventDefault()
  //       break
  //     }
  //   }
  // }

  // React.useEffect(() => {
  //   window.addEventListener('keydown', handleKeyDown)
  //   return () => window.removeEventListener('keydown', handleKeyDown)
  // }, [])
}
