import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TDShapeType } from '~types'
import { useFileSystemHandlers, useTldrawApp } from '~hooks'

export function useKeyboardShortcuts(ref: React.RefObject<HTMLDivElement>) {
  const app = useTldrawApp()

  const canHandleEvent = React.useCallback(() => {
    const elm = ref.current
    return elm && (document.activeElement === elm || elm.contains(document.activeElement))
  }, [ref])

  /* ---------------------- Tools --------------------- */

  useHotkeys(
    'v,1',
    () => {
      if (canHandleEvent()) app.selectTool('select')
    },
    [app, ref.current]
  )

  useHotkeys(
    'd,2',
    () => {
      if (canHandleEvent()) app.selectTool(TDShapeType.Draw)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'e,3',
    () => {
      if (canHandleEvent()) app.selectTool('erase')
    },
    undefined,
    [app]
  )

  useHotkeys(
    'r,4',
    () => {
      if (canHandleEvent()) app.selectTool(TDShapeType.Rectangle)
    },
    undefined,
    [app]
  )

  useHotkeys(
    '5',
    () => {
      if (canHandleEvent()) app.selectTool(TDShapeType.Ellipse)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'a,6',
    () => {
      if (canHandleEvent()) app.selectTool(TDShapeType.Arrow)
    },
    undefined,
    [app]
  )

  useHotkeys(
    't,7',
    () => {
      if (canHandleEvent()) app.selectTool(TDShapeType.Text)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'n,8',
    () => {
      if (canHandleEvent()) app.selectTool(TDShapeType.Sticky)
    },
    undefined,
    [app]
  )

  /* ---------------------- Misc ---------------------- */

  // Dark Mode

  useHotkeys(
    'ctrl+shift+d,command+shift+d',
    (e) => {
      if (canHandleEvent()) {
        app.toggleDarkMode()
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )

  // Focus Mode

  useHotkeys(
    'ctrl+.,command+.',
    () => {
      if (canHandleEvent()) app.toggleFocusMode()
    },
    undefined,
    [app]
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
    [app]
  )
  useHotkeys(
    'ctrl+s,command+s',
    (e) => {
      if (canHandleEvent()) {
        onSaveProject(e)
      }
    },
    undefined,
    [app]
  )

  useHotkeys(
    'ctrl+shift+s,command+shift+s',
    (e) => {
      if (canHandleEvent()) {
        onSaveProjectAs(e)
      }
    },
    undefined,
    [app]
  )
  useHotkeys(
    'ctrl+o,command+o',
    (e) => {
      if (canHandleEvent()) {
        onOpenProject(e)
      }
    },
    undefined,
    [app]
  )

  // Undo Redo

  useHotkeys(
    'command+z,ctrl+z',
    () => {
      if (canHandleEvent()) {
        if (app.session) {
          app.cancelSession()
        } else {
          app.undo()
        }
      }
    },
    undefined,
    [app]
  )

  useHotkeys(
    'ctrl+shift-z,command+shift+z',
    () => {
      if (canHandleEvent()) {
        if (app.session) {
          app.cancelSession()
        } else {
          app.redo()
        }
      }
    },
    undefined,
    [app]
  )

  // Undo Redo

  useHotkeys(
    'command+u,ctrl+u',
    () => {
      if (canHandleEvent()) app.undoSelect()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'ctrl+shift-u,command+shift+u',
    () => {
      if (canHandleEvent()) app.redoSelect()
    },
    undefined,
    [app]
  )

  /* -------------------- Commands -------------------- */

  // Camera

  useHotkeys(
    'ctrl+=,command+=',
    (e) => {
      if (canHandleEvent()) {
        app.zoomIn()
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )

  useHotkeys(
    'ctrl+-,command+-',
    (e) => {
      if (canHandleEvent()) {
        app.zoomOut()
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+1',
    () => {
      if (canHandleEvent()) app.zoomToFit()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+2',
    () => {
      if (canHandleEvent()) app.zoomToSelection()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+0',
    () => {
      if (canHandleEvent()) app.resetZoom()
    },
    undefined,
    [app]
  )

  // Duplicate

  useHotkeys(
    'ctrl+d,command+d',
    (e) => {
      if (canHandleEvent()) {
        app.duplicate()
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )

  // Flip

  useHotkeys(
    'shift+h',
    () => {
      if (canHandleEvent()) app.flipHorizontal()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+v',
    () => {
      if (canHandleEvent()) app.flipVertical()
    },
    undefined,
    [app]
  )

  // Cancel

  useHotkeys(
    'escape',
    () => {
      if (canHandleEvent()) {
        app.cancel()
      }
    },
    undefined,
    [app]
  )

  // Delete

  useHotkeys(
    'backspace',
    () => {
      if (canHandleEvent()) app.delete()
    },
    undefined,
    [app]
  )

  // Select All

  useHotkeys(
    'command+a,ctrl+a',
    () => {
      if (canHandleEvent()) app.selectAll()
    },
    undefined,
    [app]
  )

  // Nudge

  useHotkeys(
    'up',
    () => {
      if (canHandleEvent()) app.nudge([0, -1], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'right',
    () => {
      if (canHandleEvent()) app.nudge([1, 0], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'down',
    () => {
      if (canHandleEvent()) app.nudge([0, 1], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'left',
    () => {
      if (canHandleEvent()) app.nudge([-1, 0], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+up',
    () => {
      if (canHandleEvent()) app.nudge([0, -1], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+right',
    () => {
      if (canHandleEvent()) app.nudge([1, 0], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+down',
    () => {
      if (canHandleEvent()) app.nudge([0, 1], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+left',
    () => {
      if (canHandleEvent()) app.nudge([-1, 0], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'command+shift+l,ctrl+shift+l',
    () => {
      if (canHandleEvent()) app.toggleLocked()
    },
    undefined,
    [app]
  )

  // Copy, Cut & Paste

  useHotkeys(
    'command+c,ctrl+c',
    () => {
      if (canHandleEvent()) app.copy()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'command+x,ctrl+x',
    () => {
      if (canHandleEvent()) app.cut()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'command+v,ctrl+v',
    () => {
      if (canHandleEvent()) app.paste()
    },
    undefined,
    [app]
  )

  // Group & Ungroup

  useHotkeys(
    'command+g,ctrl+g',
    (e) => {
      if (canHandleEvent()) {
        app.group()
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )

  useHotkeys(
    'command+shift+g,ctrl+shift+g',
    (e) => {
      if (canHandleEvent()) {
        app.ungroup()
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )

  // Move

  useHotkeys(
    '[',
    () => {
      if (canHandleEvent()) app.moveBackward()
    },
    undefined,
    [app]
  )

  useHotkeys(
    ']',
    () => {
      if (canHandleEvent()) app.moveForward()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+[',
    () => {
      if (canHandleEvent()) app.moveToBack()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+]',
    () => {
      if (canHandleEvent()) app.moveToFront()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'command+shift+backspace',
    (e) => {
      if (canHandleEvent()) {
        if (process.env.NODE_ENV === 'development') {
          app.resetDocument()
        }
        e.preventDefault()
      }
    },
    undefined,
    [app]
  )
}
