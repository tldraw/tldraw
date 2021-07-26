import { useHotkeys } from 'react-hotkeys-hook'
import { state } from '../state'

export function useKeyboardShortcuts() {
  useHotkeys('ctrl+z,command+z', () => {
    console.log('here!')
    state.send('UNDO')
  })
  useHotkeys('ctrl+shift-z,command+shift+z', () => {
    console.log('here!')
    state.send('REDO')
  })
}
