import { inputs, MoveType } from '@tldraw/core'
import React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '../shape'
import { state } from '../state'

function handleKeyDown(e: KeyboardEvent) {
  const info = inputs.keydown(e)
  switch (e.key) {
    case 'Alt': {
      state.send('PRESSED_ALT_KEY', info)
      break
    }
    case 'Option': {
      state.send('PRESSED_ALT_KEY', info)
      break
    }
    case 'Shift': {
      state.send('PRESSED_SHIFT_KEY', info)
      break
    }
  }
}

function handleKeyUp(e: KeyboardEvent) {
  const info = inputs.keyup(e)
  switch (e.key) {
    case 'Alt': {
      state.send('RELEASED_ALT_KEY', info)
      break
    }
    case 'Option': {
      state.send('RELEASED_ALT_KEY', info)
      break
    }
    case 'Shift': {
      state.send('RELEASED_SHIFT_KEY', info)
      break
    }
  }
}

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

  useHotkeys('d,2', (e) => {
    state.send('SELECTED_TOOL', { type: TLDrawShapeType.Draw })
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

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
}
