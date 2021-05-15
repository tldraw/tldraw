import { useEffect } from "react"
import state from "state"
import { getKeyboardEventInfo, isDarwin, metaKey } from "utils/utils"

export default function useKeyboardEvents() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        state.send("CANCELLED")
      } else if (e.key === "z" && metaKey(e)) {
        if (e.shiftKey) {
          state.send("REDO")
        } else {
          state.send("UNDO")
        }
      }

      if (e.key === "Backspace" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("DELETED", getKeyboardEventInfo(e))
      }

      if (e.key === "v" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_SELECT_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "d" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_DOT_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "c" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_CIRCLE_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "i" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_ELLIPSE_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "l" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_LINE_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "y" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_RAY_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "p" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_POLYLINE_TOOL", getKeyboardEventInfo(e))
      }

      if (e.key === "r" && !(metaKey(e) || e.shiftKey || e.altKey)) {
        state.send("SELECTED_RECTANGLE_TOOL", getKeyboardEventInfo(e))
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Escape") {
        state.send("CANCELLED")
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
