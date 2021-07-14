/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react'
import state from 'state'
import inputs from 'state/inputs'
import { ColorStyle, MoveType, SizeStyle } from 'types'
import { metaKey } from 'utils'

export default function useKeyboardEvents() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const info = inputs.keydown(e)
      const meta = metaKey(e)

      if (
        meta &&
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
        case '1': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Black })
            break
          }
          if (e.altKey) {
            state.send('CHANGED_STYLE', { size: SizeStyle.Small })
            break
          }
          state.send('SELECTED_SELECT_TOOL', info)
          break
        }
        case '2': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.White })
            break
          }
          if (e.altKey) {
            state.send('CHANGED_STYLE', { size: SizeStyle.Medium })
            break
          }
          state.send('SELECTED_DRAW_TOOL', info)
          break
        }
        case '3': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Green })
            break
          }
          if (e.altKey) {
            state.send('CHANGED_STYLE', { size: SizeStyle.Large })
            break
          }
          state.send('SELECTED_RECTANGLE_TOOL', info)
          break
        }
        case '4': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Blue })
          }
          state.send('SELECTED_ELLIPSE_TOOL', info)
          break
        }
        case '5': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Indigo })
            break
          }
          state.send('SELECTED_ARROW_TOOL', info)
          break
        }
        case '6': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Violet })
            break
          }
          state.send('SELECTED_TEXT_TOOL', info)
          break
        }
        case '7': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Red })
            break
          }
          state.send('TOGGLED_TOOL_LOCK', info)
          break
        }
        case '8': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Orange })
            break
          }
          break
        }
        case '9': {
          if (meta) {
            state.send('CHANGED_STYLE', { color: ColorStyle.Yellow })
            break
          }
          break
        }
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
          if (meta) {
            if (e.shiftKey) {
              state.send('REDO', info)
            } else {
              state.send('UNDO', info)
            }
          }
          break
        }
        case '‘': {
          if (meta) {
            state.send('MOVED', {
              ...info,
              type: MoveType.ToFront,
            })
          }
          break
        }
        case '“': {
          if (meta) {
            state.send('MOVED', {
              ...info,
              type: MoveType.ToBack,
            })
          }
          break
        }
        case ']': {
          if (meta) {
            state.send('MOVED', {
              ...info,
              type: MoveType.Forward,
            })
          }
          break
        }
        case '[': {
          if (meta) {
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
          if (meta) {
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
          if (meta) {
            if (e.shiftKey) {
              state.send('UNGROUPED', info)
            } else {
              state.send('GROUPED', info)
            }
          }
          break
        }
        case 's': {
          if (meta) {
            if (e.shiftKey) {
              state.send('SAVED_AS_TO_FILESYSTEM', info)
            } else {
              state.send('SAVED', info)
            }
          }
          break
        }
        case 'o': {
          if (meta) {
            break
          } else {
            state.send('SELECTED_DOT_TOOL', info)
          }
          break
        }
        case 'v': {
          if (meta) {
            state.send('PASTED', info)
          } else {
            state.send('SELECTED_SELECT_TOOL', info)
          }
          break
        }
        case 'a': {
          if (meta) {
            state.send('SELECTED_ALL', info)
          } else {
            state.send('SELECTED_ARROW_TOOL', info)
          }
          break
        }
        case 'd': {
          if (meta) {
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
          if (meta) {
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
          if (meta) {
            break
          } else {
            state.send('SELECTED_CIRCLE_TOOL', info)
          }
          break
        }
        case 'l': {
          if (meta) {
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
          if (meta) {
            break
          } else {
            state.send('SELECTED_RAY_TOOL', info)
          }
          break
        }
        case 'p': {
          if (meta) {
            break
          } else {
            state.send('SELECTED_POLYLINE_TOOL', info)
          }
          break
        }
        case 'r': {
          if (meta) {
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

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
}
