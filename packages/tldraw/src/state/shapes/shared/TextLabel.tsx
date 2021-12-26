import type { TLShapeBlurHandler, TLShapeChangeHandler } from '@tldraw/core'
import Vec from '@tldraw/vec'
import * as React from 'react'
import { stopPropagation } from '~components/stopPropagation'
import { GHOSTED_OPACITY, LETTER_SPACING } from '~constants'
import { TLDR } from '~state/TLDR'
import { styled } from '~styles'
import { AlignStyle, RectangleShape } from '~types'
import { getFontStyle, TextAreaUtils } from '.'

export interface TextLabelProps {
  color: string
  font: string
  text: string
  onBlur: () => void
  onChange: (text: string) => void
  isEditing?: boolean
}

export const TextLabel = React.memo(function TextLabel({
  color,
  font,
  text,
  isEditing = false,
  onBlur,
  onChange,
}: TextLabelProps) {
  const rInput = React.useRef<HTMLTextAreaElement>(null)
  const rIsMounted = React.useRef(false)

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(TLDR.normalizeText(e.currentTarget.value))
    },
    [onChange]
  )

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
      if (!(e.key === 'Meta' || e.metaKey)) {
        e.stopPropagation()
      } else if (e.key === 'z' && e.metaKey) {
        if (e.shiftKey) {
          document.execCommand('redo', false)
        } else {
          document.execCommand('undo', false)
        }
        e.stopPropagation()
        e.preventDefault()
        return
      }

      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.currentTarget.blur()
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          TextAreaUtils.unindent(e.currentTarget)
        } else {
          TextAreaUtils.indent(e.currentTarget)
        }

        onChange(TLDR.normalizeText(e.currentTarget.value))
      }
    },
    [onChange]
  )

  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      e.currentTarget.setSelectionRange(0, 0)
      onBlur()
    },
    [onBlur]
  )

  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (!isEditing) return
      if (!rIsMounted.current) return

      if (document.activeElement === e.currentTarget) {
        e.currentTarget.select()
      }
    },
    [isEditing]
  )

  const handlePointerDown = React.useCallback(
    (e) => {
      if (isEditing) {
        e.stopPropagation()
      }
    },
    [isEditing]
  )

  React.useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        rIsMounted.current = true
        const elm = rInput.current
        if (elm) {
          elm.focus()
          elm.select()
        }
      })
    } else {
      onBlur()
    }
  }, [isEditing, onBlur])

  const rInnerWrapper = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const size = getTextLabelSize(text, font)
    const elm = rInnerWrapper.current
    if (!elm) return
    elm.style.width = size[0] + 'px'
    elm.style.height = size[1] + 'px'
  }, [text, font])

  return (
    <TextWrapper>
      <InnerWrapper
        ref={rInnerWrapper}
        style={{
          font,
          color,
        }}
      >
        {isEditing ? (
          <TextArea
            ref={rInput}
            style={{
              font,
              color,
            }}
            name="text"
            tabIndex={-1}
            autoComplete="false"
            autoCapitalize="false"
            autoCorrect="false"
            autoSave="false"
            autoFocus
            placeholder=""
            spellCheck="true"
            wrap="off"
            dir="auto"
            datatype="wysiwyg"
            defaultValue={text}
            color={color}
            onFocus={handleFocus}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onPointerDown={handlePointerDown}
            onContextMenu={stopPropagation}
          />
        ) : (
          text
        )}
        &#8203;
      </InnerWrapper>
    </TextWrapper>
  )
})

const TextWrapper = styled('div', {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    isGhost: {
      false: { opacity: 1 },
      true: { transition: 'opacity .2s', opacity: GHOSTED_OPACITY },
    },
    isEditing: {
      false: {
        pointerEvents: 'all',
        userSelect: 'all',
      },
      true: {
        pointerEvents: 'none',
        userSelect: 'none',
      },
    },
  },
})

const commonTextWrapping = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
}

const InnerWrapper = styled('div', {
  position: 'absolute',
  padding: '4px',
  zIndex: 1,
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1,
  letterSpacing: LETTER_SPACING,
  outline: 0,
  fontWeight: '500',
  textAlign: 'center',
  backfaceVisibility: 'hidden',
  userSelect: 'none',
  pointerEvents: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  isEditing: {
    false: {},
    true: {
      pointerEvents: 'all',
      background: '$boundsBg',
      userSelect: 'text',
      WebkitUserSelect: 'text',
    },
  },
  ...commonTextWrapping,
})

const TextArea = styled('textarea', {
  position: 'absolute',
  top: 0,
  left: 0,
  zIndex: 1,
  width: '100%',
  height: '100%',
  border: 'none',
  padding: '4px',
  resize: 'none',
  textAlign: 'inherit',
  minHeight: 'inherit',
  minWidth: 'inherit',
  lineHeight: 'inherit',
  letterSpacing: 'inherit',
  outline: 0,
  fontWeight: 'inherit',
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  pointerEvents: 'all',
  background: '$boundsBg',
  userSelect: 'text',
  WebkitUserSelect: 'text',
  ...commonTextWrapping,
})

/* -------------------------------------------------- */
/*                        Utils                       */
/* -------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let melm: any

function getMeasurementDiv() {
  // A div used for measurement
  document.getElementById('__textLabelMeasure')?.remove()

  const pre = document.createElement('pre')
  pre.id = '__textLabelMeasure'

  Object.assign(pre.style, {
    whiteSpace: 'pre',
    width: 'auto',
    border: '1px solid transparent',
    padding: '4px',
    margin: '0px',
    letterSpacing: `${LETTER_SPACING}px`,
    opacity: '0',
    position: 'absolute',
    top: '-500px',
    left: '0px',
    zIndex: '9999',
    pointerEvents: 'none',
    userSelect: 'none',
    alignmentBaseline: 'mathematical',
    dominantBaseline: 'mathematical',
  })

  pre.tabIndex = -1

  document.body.appendChild(pre)
  return pre
}

if (typeof window !== 'undefined') {
  melm = getMeasurementDiv()
}

function getTextLabelSize(text: string, font: string) {
  if (!text) {
    return [0, 0]
  }

  if (!melm) {
    // We're in SSR
    return [10, 10]
  }

  melm.innerHTML = `${text}&zwj;`
  melm.style.font = font

  // In tests, offsetWidth and offsetHeight will be 0
  const width = melm.offsetWidth || 1
  const height = melm.offsetHeight || 1

  return [width, height]
}
