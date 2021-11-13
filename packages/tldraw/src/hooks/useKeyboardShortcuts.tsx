import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '~types'
import { useFileSystemHandlers, useTLDrawContext } from '~hooks'

export function useKeyboardShortcuts(ref: React.RefObject<HTMLDivElement>) {
  const { state } = useTLDrawContext()

  const canHandleEvent = React.useCallback(() => {
    const elm = ref.current
    return elm && (document.activeElement === elm || elm.contains(document.activeElement))
  }, [ref])

  /* ---------------------- Tools --------------------- */

  useHotkeys(
    'v,1',
    () => {
      if (canHandleEvent()) state.selectTool('select')
    },
    [state, ref.current]
  )

  useHotkeys(
    'd,2',
    () => {
      if (canHandleEvent()) state.selectTool(TLDrawShapeType.Draw)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'e,3',
    () => {
      if (canHandleEvent()) state.selectTool('erase')
    },
    undefined,
    [state]
  )

  useHotkeys(
    'r,4',
    () => {
      if (canHandleEvent()) state.selectTool(TLDrawShapeType.Rectangle)
    },
    undefined,
    [state]
  )

  useHotkeys(
    '5',
    () => {
      if (canHandleEvent()) state.selectTool(TLDrawShapeType.Ellipse)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'a,6',
    () => {
      if (canHandleEvent()) state.selectTool(TLDrawShapeType.Arrow)
    },
    undefined,
    [state]
  )

  useHotkeys(
    't,7',
    () => {
      if (canHandleEvent()) state.selectTool(TLDrawShapeType.Text)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'n,8',
    () => {
      if (canHandleEvent()) state.selectTool(TLDrawShapeType.Sticky)
    },
    undefined,
    [state]
  )

  /* ---------------------- Misc ---------------------- */

  // Dark Mode

  useHotkeys(
    'ctrl+shift+d,command+shift+d',
    (e) => {
      if (canHandleEvent()) {
        state.toggleDarkMode()
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )

  // Focus Mode

  useHotkeys(
    'ctrl+.,command+.',
    () => {
      if (canHandleEvent()) state.toggleFocusMode()
    },
    undefined,
    [state]
  )

  // File System

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystemHandlers()

  useHotkeys(
    'ctrl+n,command+n',
    (e) => {
      if (canHandleEvent()) {
        onNewProject(e)
      }
    },
    undefined,
    [state]
  )
  useHotkeys(
    'ctrl+s,command+s',
    (e) => {
      if (canHandleEvent()) {
        onSaveProject(e)
      }
    },
    undefined,
    [state]
  )

  useHotkeys(
    'ctrl+shift+s,command+shift+s',
    (e) => {
      if (canHandleEvent()) {
        onSaveProjectAs(e)
      }
    },
    undefined,
    [state]
  )
  useHotkeys(
    'ctrl+o,command+o',
    (e) => {
      if (canHandleEvent()) {
        onOpenProject(e)
      }
    },
    undefined,
    [state]
  )

  // Undo Redo

  useHotkeys(
    'command+z,ctrl+z',
    () => {
      if (canHandleEvent()) {
        if (state.session) {
          state.cancelSession()
        } else {
          state.undo()
        }
      }
    },
    undefined,
    [state]
  )

  useHotkeys(
    'ctrl+shift-z,command+shift+z',
    () => {
      if (canHandleEvent()) {
        if (state.session) {
          state.cancelSession()
        } else {
          state.redo()
        }
      }
    },
    undefined,
    [state]
  )

  // Undo Redo

  useHotkeys(
    'command+u,ctrl+u',
    () => {
      if (canHandleEvent()) state.undoSelect()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'ctrl+shift-u,command+shift+u',
    () => {
      if (canHandleEvent()) state.redoSelect()
    },
    undefined,
    [state]
  )

  /* -------------------- Commands -------------------- */

  // Camera

  useHotkeys(
    'ctrl+=,command+=',
    (e) => {
      if (canHandleEvent()) {
        state.zoomIn()
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )

  useHotkeys(
    'ctrl+-,command+-',
    (e) => {
      if (canHandleEvent()) {
        state.zoomOut()
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+1',
    () => {
      if (canHandleEvent()) state.zoomToFit()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+2',
    () => {
      if (canHandleEvent()) state.zoomToSelection()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+0',
    () => {
      if (canHandleEvent()) state.resetZoom()
    },
    undefined,
    [state]
  )

  // Duplicate

  useHotkeys(
    'ctrl+d,command+d',
    (e) => {
      if (canHandleEvent()) {
        state.duplicate()
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )

  // Flip

  useHotkeys(
    'shift+h',
    () => {
      if (canHandleEvent()) state.flipHorizontal()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+v',
    () => {
      if (canHandleEvent()) state.flipVertical()
    },
    undefined,
    [state]
  )

  // Cancel

  useHotkeys(
    'escape',
    () => {
      if (canHandleEvent()) {
        state.cancel()
      }
    },
    undefined,
    [state]
  )

  // Delete

  useHotkeys(
    'backspace',
    () => {
      if (canHandleEvent()) state.delete()
    },
    undefined,
    [state]
  )

  // Select All

  useHotkeys(
    'command+a,ctrl+a',
    () => {
      if (canHandleEvent()) state.selectAll()
    },
    undefined,
    [state]
  )

  // Nudge

  useHotkeys(
    'up',
    () => {
      if (canHandleEvent()) state.nudge([0, -1], false)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'right',
    () => {
      if (canHandleEvent()) state.nudge([1, 0], false)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'down',
    () => {
      if (canHandleEvent()) state.nudge([0, 1], false)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'left',
    () => {
      if (canHandleEvent()) state.nudge([-1, 0], false)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+up',
    () => {
      if (canHandleEvent()) state.nudge([0, -1], true)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+right',
    () => {
      if (canHandleEvent()) state.nudge([1, 0], true)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+down',
    () => {
      if (canHandleEvent()) state.nudge([0, 1], true)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+left',
    () => {
      if (canHandleEvent()) state.nudge([-1, 0], true)
    },
    undefined,
    [state]
  )

  useHotkeys(
    'command+shift+l,ctrl+shift+l',
    () => {
      if (canHandleEvent()) state.toggleLocked()
    },
    undefined,
    [state]
  )

  // Copy, Cut & Paste

  useHotkeys(
    'command+c,ctrl+c',
    () => {
      if (canHandleEvent()) state.copy()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'command+x,ctrl+x',
    () => {
      if (canHandleEvent()) state.cut()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'command+v,ctrl+v',
    () => {
      if (canHandleEvent()) state.paste()
    },
    undefined,
    [state]
  )

  // Group & Ungroup

  useHotkeys(
    'command+g,ctrl+g',
    (e) => {
      if (canHandleEvent()) {
        state.group()
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )

  useHotkeys(
    'command+shift+g,ctrl+shift+g',
    (e) => {
      if (canHandleEvent()) {
        state.ungroup()
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )

  // Move

  useHotkeys(
    '[',
    () => {
      if (canHandleEvent()) state.moveBackward()
    },
    undefined,
    [state]
  )

  useHotkeys(
    ']',
    () => {
      if (canHandleEvent()) state.moveForward()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+[',
    () => {
      if (canHandleEvent()) state.moveToBack()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'shift+]',
    () => {
      if (canHandleEvent()) state.moveToFront()
    },
    undefined,
    [state]
  )

  useHotkeys(
    'command+shift+backspace',
    (e) => {
      if (canHandleEvent()) {
        if (process.env.NODE_ENV === 'development') {
          state.resetDocument()
        }
        e.preventDefault()
      }
    },
    undefined,
    [state]
  )
}
