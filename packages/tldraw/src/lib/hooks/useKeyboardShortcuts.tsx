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
}
