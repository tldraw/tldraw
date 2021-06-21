/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react'
import state from 'state'
import { MoveType } from 'types'
import { getKeyboardEventInfo, metaKey } from 'utils/utils'

export default function useKeyboardEvents() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        metaKey(e) &&
        ![
          'a',
          'i',
          'r',
          'j',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'z',
        ].includes(e.key)
      ) {
        e.preventDefault()
      }

      switch (e.key) {
        case 'ArrowUp': {
          state.send('NUDGED', { delta: [0, -1], ...getKeyboardEventInfo(e) })
          break
        }
        case 'ArrowRight': {
          state.send('NUDGED', { delta: [1, 0], ...getKeyboardEventInfo(e) })
          break
        }
        case 'ArrowDown': {
          state.send('NUDGED', { delta: [0, 1], ...getKeyboardEventInfo(e) })
          break
        }
        case 'ArrowLeft': {
          state.send('NUDGED', { delta: [-1, 0], ...getKeyboardEventInfo(e) })
          break
        }
        case '=': {
          if (e.metaKey) {
            state.send('ZOOMED_IN')
          }
          break
        }
        case '-': {
          if (e.metaKey) {
            state.send('ZOOMED_OUT')
          }
          break
        }
        case '!': {
          // Shift + 1
          if (e.shiftKey) {
            state.send('ZOOMED_TO_FIT')
          }
          break
        }
        case '@': {
          // Shift + 2
          if (e.shiftKey) {
            state.send('ZOOMED_TO_SELECTION')
          }
          break
        }
        case ')': {
          // Shift + 0
          if (e.shiftKey) {
            state.send('ZOOMED_TO_ACTUAL')
          }
          break
        }
        case 'Escape': {
          state.send('CANCELLED')
          break
        }
        case 'z': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('REDO', getKeyboardEventInfo(e))
            } else {
              state.send('UNDO', getKeyboardEventInfo(e))
            }
          }
          break
        }
        case '‘': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...getKeyboardEventInfo(e),
              type: MoveType.ToFront,
            })
          }
          break
        }
        case '“': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...getKeyboardEventInfo(e),
              type: MoveType.ToBack,
            })
          }
          break
        }
        case ']': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...getKeyboardEventInfo(e),
              type: MoveType.Forward,
            })
          }
          break
        }
        case '[': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...getKeyboardEventInfo(e),
              type: MoveType.Backward,
            })
          }
          break
        }
        case 'Shift': {
          state.send('PRESSED_SHIFT_KEY', getKeyboardEventInfo(e))
          break
        }
        case 'Alt': {
          state.send('PRESSED_ALT_KEY', getKeyboardEventInfo(e))
          break
        }
        case 'Backspace': {
          state.send('DELETED', getKeyboardEventInfo(e))
          break
        }
        case 'g': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('UNGROUPED', getKeyboardEventInfo(e))
            } else {
              state.send('GROUPED', getKeyboardEventInfo(e))
            }
          }
          break
        }
        case 's': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('SAVED_AS_TO_FILESYSTEM', getKeyboardEventInfo(e))
            } else {
              state.send('SAVED', getKeyboardEventInfo(e))
            }
          }
          break
        }
        case 'o': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_DOT_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'v': {
          if (metaKey(e)) {
            state.send('PASTED', getKeyboardEventInfo(e))
          } else {
            state.send('SELECTED_SELECT_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'a': {
          if (metaKey(e)) {
            state.send('SELECTED_ALL', getKeyboardEventInfo(e))
          } else {
            state.send('SELECTED_ARROW_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'd': {
          if (metaKey(e)) {
            state.send('DUPLICATED', getKeyboardEventInfo(e))
          } else {
            state.send('SELECTED_DRAW_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 't': {
          state.send('SELECTED_TEXT_TOOL', getKeyboardEventInfo(e))
          break
        }
        case 'c': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('COPIED_TO_SVG', getKeyboardEventInfo(e))
            } else {
              state.send('COPIED', getKeyboardEventInfo(e))
            }
          } else {
            state.send('SELECTED_ELLIPSE_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'i': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_CIRCLE_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'l': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('LOADED_FROM_FILE_STSTEM', getKeyboardEventInfo(e))
            }
          } else {
            state.send('SELECTED_LINE_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'y': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_RAY_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'p': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_POLYLINE_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        case 'r': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_RECTANGLE_TOOL', getKeyboardEventInfo(e))
          }
          break
        }
        default: {
          state.send('PRESSED_KEY', getKeyboardEventInfo(e))
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') {
        state.send('RELEASED_SHIFT_KEY', getKeyboardEventInfo(e))
      }

      if (e.key === 'Alt') {
        state.send('RELEASED_ALT_KEY', getKeyboardEventInfo(e))
      }

      state.send('RELEASED_KEY', getKeyboardEventInfo(e))
    }

    document.body.addEventListener('keydown', handleKeyDown)
    document.body.addEventListener('keyup', handleKeyUp)
    return () => {
      document.body.removeEventListener('keydown', handleKeyDown)
      document.body.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
}
