import { useHotkeys } from 'react-hotkeys-hook'
import { state } from '../state'

export function useKeyboardShortcuts() {
  useHotkeys('ctrl+z,command+z', () => {
    state.send('UNDO')
  })
  useHotkeys('ctrl+shift-z,command+shift+z', () => {
    state.send('REDO')
  })
}
