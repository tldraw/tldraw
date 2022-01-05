import * as React from 'react'
import { TLDR } from '~state/TLDR'
import { TextAreaUtils } from '.'

export function useTextKeyboardEvents(onChange: (text: string) => void) {
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // If this keydown was just the meta key or a shortcut
      // that includes holding the meta key like (Command+V)
      // then leave the event untouched. We also have to explicitly
      // Implement undo/redo for some reason in order to get this working
      // in the vscode extension. Without the below code the following doesn't work
      //
      // - You can't cut/copy/paste when when text-editing/focused
      // - You can't undo/redo when when text-editing/focused
      // - You can't use Command+A to select all the text, when when text-editing/focused
      if (e.metaKey) e.stopPropagation()

      switch (e.key) {
        case 'Meta': {
          e.stopPropagation()
          break
        }
        case 'z': {
          if (e.metaKey) {
            if (e.shiftKey) {
              document.execCommand('redo', false)
            } else {
              document.execCommand('undo', false)
            }
            e.preventDefault()
          }
          break
        }
        case 'Escape': {
          e.currentTarget.blur()
          break
        }
        case 'Enter': {
          if (e.ctrlKey || e.metaKey) {
            e.currentTarget.blur()
          }
          break
        }
        case 'Tab': {
          e.preventDefault()
          if (e.shiftKey) {
            TextAreaUtils.unindent(e.currentTarget)
          } else {
            TextAreaUtils.indent(e.currentTarget)
          }

          onChange(TLDR.normalizeText(e.currentTarget.value))
          break
        }
      }
    },
    [onChange]
  )

  return handleKeyDown
}
