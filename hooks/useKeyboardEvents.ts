import { useEffect } from "react"
import state from "state"
import { getKeyboardEventInfo, metaKey } from "utils/utils"

export default function useKeyboardEvents() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (metaKey(e) && !["i", "r", "j"].includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case "!": {
          // Shift + 1
          if (e.shiftKey) {
            state.send("ZOOMED_TO_FIT")
          }
          break
        }
        case "@": {
          // Shift + 2
          if (e.shiftKey) {
            state.send("ZOOMED_TO_SELECTION")
          }
          break
        }
        case ")": {
          // Shift + 0
          if (e.shiftKey) {
            state.send("ZOOMED_TO_ACTUAL")
          }
          break
        }
        case "Escape": {
          state.send("CANCELLED")
          break
        }
        case "z": {
          if (metaKey(e)) {
            if (e.shiftKey) {
              state.send("REDO", getKeyboardEventInfo(e))
            } else {
              state.send("UNDO", getKeyboardEventInfo(e))
            }
          }
          break
        }
        case "‘": {
          if (metaKey(e)) {
            state.send("MOVED_TO_FRONT", getKeyboardEventInfo(e))
          }
          break
        }
        case "“": {
          if (metaKey(e)) {
            state.send("MOVED_TO_BACK", getKeyboardEventInfo(e))
          }
          break
        }
        case "]": {
          if (metaKey(e)) {
            state.send("MOVED_FORWARD", getKeyboardEventInfo(e))
          }
          break
        }
        case "[": {
          if (metaKey(e)) {
            state.send("MOVED_BACKWARD", getKeyboardEventInfo(e))
          }
          break
        }
        case "Shift": {
          state.send("PRESSED_SHIFT_KEY", getKeyboardEventInfo(e))
          break
        }
        case "Alt": {
          state.send("PRESSED_ALT_KEY", getKeyboardEventInfo(e))
          break
        }
        case "Backspace": {
          state.send("DELETED", getKeyboardEventInfo(e))
          break
        }
        case "s": {
          if (metaKey(e)) {
            state.send("SAVED", getKeyboardEventInfo(e))
          }
          break
        }
        case "a": {
          if (metaKey(e)) {
            state.send("SELECTED_ALL", getKeyboardEventInfo(e))
          }
          break
        }
        case "v": {
          if (metaKey(e)) {
            state.send("PASTED", getKeyboardEventInfo(e))
          } else {
            state.send("SELECTED_SELECT_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "d": {
          if (metaKey(e)) {
            state.send("DUPLICATED", getKeyboardEventInfo(e))
          } else {
            state.send("SELECTED_DOT_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "c": {
          if (metaKey(e)) {
            state.send("COPIED", getKeyboardEventInfo(e))
          } else {
            state.send("SELECTED_CIRCLE_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "i": {
          if (metaKey(e)) {
          } else {
            state.send("SELECTED_ELLIPSE_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "l": {
          if (metaKey(e)) {
          } else {
            state.send("SELECTED_LINE_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "y": {
          if (metaKey(e)) {
          } else {
            state.send("SELECTED_RAY_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "p": {
          if (metaKey(e)) {
          } else {
            state.send("SELECTED_POLYLINE_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        case "r": {
          if (metaKey(e)) {
          } else {
            state.send("SELECTED_RECTANGLE_TOOL", getKeyboardEventInfo(e))
          }
          break
        }
        default: {
          state.send("PRESSED_KEY", getKeyboardEventInfo(e))
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") {
        state.send("RELEASED_SHIFT_KEY", getKeyboardEventInfo(e))
      }

      if (e.key === "Alt") {
        state.send("RELEASED_ALT_KEY", getKeyboardEventInfo(e))
      }

      state.send("RELEASED_KEY", getKeyboardEventInfo(e))
    }

    document.body.addEventListener("keydown", handleKeyDown)
    document.body.addEventListener("keyup", handleKeyUp)
    return () => {
      document.body.removeEventListener("keydown", handleKeyDown)
      document.body.removeEventListener("keyup", handleKeyUp)
    }
  }, [])
}
