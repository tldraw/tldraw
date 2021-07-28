import { useHotkeys } from 'react-hotkeys-hook'
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
}
