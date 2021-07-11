/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import { MoveType } from 'types'
import { metaKey } from 'utils'

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

      const info = inputs.keydown(e)

      switch (e.key) {
        case 'ArrowUp': {
          state.send('NUDGED', { delta: [0, -1], ...info })
          break
        }
        case 'ArrowRight': {
          state.send('NUDGED', { delta: [1, 0], ...info })
          break
        }
        case 'ArrowDown': {
          state.send('NUDGED', { delta: [0, 1], ...info })
          break
        }
        case 'ArrowLeft': {
          state.send('NUDGED', { delta: [-1, 0], ...info })
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
              state.send('REDO', info)
            } else {
              state.send('UNDO', info)
            }
          }
          break
        }
        case '‘': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...info,
              type: MoveType.ToFront,
            })
          }
          break
        }
        case '“': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...info,
              type: MoveType.ToBack,
            })
          }
          break
        }
        case ']': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...info,
              type: MoveType.Forward,
            })
          }
          break
        }
        case '[': {
          if (metaKey(e)) {
            state.send('MOVED', {
              ...info,
              type: MoveType.Backward,
            })
          }
          break
        }
        case 'Shift': {
          state.send('PRESSED_SHIFT_KEY', info)
          break
        }
        case 'Alt': {
          state.send('PRESSED_ALT_KEY', info)
          break
        }
        case 'Backspace': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              if (window.confirm('Reset document and state?')) {
                state.send('RESET_DOCUMENT_STATE', info)
              }
            } else {
              state.send('FORCE_CLEARED_PAGE', info)
            }
          } else {
            state.send('DELETED', info)
          }
          break
        }
        case 'g': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('UNGROUPED', info)
            } else {
              state.send('GROUPED', info)
            }
          }
          break
        }
        case 's': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('SAVED_AS_TO_FILESYSTEM', info)
            } else {
              state.send('SAVED', info)
            }
          }
          break
        }
        case 'o': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_DOT_TOOL', info)
          }
          break
        }
        case 'v': {
          if (metaKey(e)) {
            state.send('PASTED', info)
          } else {
            state.send('SELECTED_SELECT_TOOL', info)
          }
          break
        }
        case 'a': {
          if (metaKey(e)) {
            state.send('SELECTED_ALL', info)
          } else {
            state.send('SELECTED_ARROW_TOOL', info)
          }
          break
        }
        case 'd': {
          if (metaKey(e)) {
            state.send('DUPLICATED', info)
          } else {
            state.send('SELECTED_DRAW_TOOL', info)
          }
          break
        }
        case 't': {
          state.send('SELECTED_TEXT_TOOL', info)
          break
        }
        case 'c': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('COPIED_TO_SVG', info)
            } else {
              state.send('COPIED', info)
            }
          } else {
            state.send('SELECTED_ELLIPSE_TOOL', info)
          }
          break
        }
        case 'i': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_CIRCLE_TOOL', info)
          }
          break
        }
        case 'l': {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send('TOGGLED_LOGGER')
            } else {
              state.send('LOADED_FROM_FILE_STSTEM', info)
            }
          } else {
            state.send('SELECTED_LINE_TOOL', info)
          }
          break
        }
        case 'y': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_RAY_TOOL', info)
          }
          break
        }
        case 'p': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_POLYLINE_TOOL', info)
          }
          break
        }
        case 'r': {
          if (metaKey(e)) {
            break
          } else {
            state.send('SELECTED_RECTANGLE_TOOL', info)
          }
          break
        }
        case '|': {
          state.send('COPIED_STATE_TO_CLIPBOARD')
          break
        }
        default: {
          null
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      const info = inputs.keyup(e)

      if (e.key === 'Shift') {
        state.send('RELEASED_SHIFT_KEY', info)
      }

      if (e.key === 'Alt') {
        state.send('RELEASED_ALT_KEY', info)
      }
    }

    document.body.addEventListener('keydown', handleKeyDown)
    document.body.addEventListener('keyup', handleKeyUp)
    return () => {
      document.body.removeEventListener('keydown', handleKeyDown)
      document.body.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
}
