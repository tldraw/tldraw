import { uniqueId } from 'utils/utils'
import { TextShape, ShapeType, FontSize } from 'types'
import { registerShapeUtils } from './index'
import {
  defaultStyle,
  getFontSize,
  getFontStyle,
  getShapeStyle,
} from 'lib/shape-styles'
import styled from 'styles'
import state from 'state'
import React from 'react'

if (document.getElementById('__textMeasure')) {
  document.getElementById('__textMeasure').remove()
}

// A div used for measurement
const mdiv = document.createElement('pre')
mdiv.id = '__textMeasure'
mdiv.style.whiteSpace = 'pre'
mdiv.style.width = 'auto'
mdiv.style.border = '1px solid red'
mdiv.style.padding = '4px'
mdiv.style.margin = '0px'
mdiv.style.opacity = '0'
mdiv.style.position = 'absolute'
mdiv.style.top = '-500px'
mdiv.style.left = '0px'
mdiv.style.zIndex = '9999'
mdiv.tabIndex = -1
mdiv.setAttribute('readonly', 'true')
document.body.appendChild(mdiv)

function normalizeText(text: string) {
  return text.replace(/\t/g, '        ').replace(/\r?\n|\r/g, '\n')
}

const text = registerShapeUtils<TextShape>({
  isForeignObject: true,
  canChangeAspectRatio: false,
  canEdit: true,

  boundsCache: new WeakMap([]),

  create(props) {
    return {
      id: uniqueId(),
      seed: Math.random(),
      type: ShapeType.Text,
      isGenerated: false,
      name: 'Text',
      parentId: 'page1',
      childIndex: 0,
      point: [0, 0],
      rotation: 0,
      isAspectRatioLocked: false,
      isLocked: false,
      isHidden: false,
      style: defaultStyle,
      text: '',
      scale: 1,
      size: 'auto',
      fontSize: FontSize.Medium,
      ...props,
    }
  },

  render(shape, { isEditing, ref }) {
    const { id, text, style } = shape
    const styles = getShapeStyle(style)
    const font = getFontStyle(shape.fontSize, shape.scale, shape.style)

    const bounds = this.getBounds(shape)

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      state.send('EDITED_SHAPE', {
        change: { text: normalizeText(e.currentTarget.value) },
      })
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      e.stopPropagation()
      if (e.key === 'Tab') {
        e.preventDefault()
      }
    }

    function handleBlur() {
      state.send('BLURRED_EDITING_SHAPE')
    }

    function handleFocus(e: React.FocusEvent<HTMLTextAreaElement>) {
      e.currentTarget.select()
      state.send('FOCUSED_EDITING_SHAPE')
    }

    const lineHeight = getFontSize(shape.fontSize) * shape.scale
    const gap = lineHeight * 0.4

    if (!isEditing) {
      return (
        <g id={id} pointerEvents="none">
          {text.split('\n').map((str, i) => (
            <text
              key={i}
              x={4}
              y={4 + gap / 2 + i * (lineHeight + gap)}
              style={{ font }}
              width={bounds.width}
              height={bounds.height}
              dominant-baseline="hanging"
            >
              {str}
            </text>
          ))}
        </g>
      )
    }

    return (
      <foreignObject
        id={id}
        x={0}
        y={0}
        width={bounds.width}
        height={bounds.height}
        pointerEvents="none"
      >
        {isEditing ? (
          <StyledTextArea
            ref={ref}
            style={{
              font,
              color: styles.stroke,
            }}
            tabIndex={0}
            value={text}
            autoComplete="false"
            autoCapitalize="false"
            autoCorrect="false"
            spellCheck="false"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            dir="auto"
          />
        ) : (
          <StyledText
            style={{
              font,
              color: styles.stroke,
            }}
          >
            {text}
          </StyledText>
        )}
      </foreignObject>
    )
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      mdiv.innerHTML = shape.text + '&zwj;'
      mdiv.style.font = getFontStyle(shape.fontSize, shape.scale, shape.style)

      const [minX, minY] = shape.point
      const [width, height] = [mdiv.offsetWidth, mdiv.offsetHeight]

      this.boundsCache.set(shape, {
        minX,
        maxX: minX + width,
        minY,
        maxY: minY + height,
        width,
        height,
      })
    }

    return this.boundsCache.get(shape)
  },

  hitTest(shape, test) {
    return true
  },

  transform(shape, bounds, { initialShape, transformOrigin, scaleX, scaleY }) {
    if (shape.rotation === 0 && !shape.isAspectRatioLocked) {
      shape.point = [bounds.minX, bounds.minY]
      shape.scale = initialShape.scale * Math.abs(scaleX)
    } else {
      shape.point = [bounds.minX, bounds.minY]

      shape.rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? -initialShape.rotation
          : initialShape.rotation

      shape.scale = initialShape.scale * Math.abs(Math.min(scaleX, scaleY))
    }

    return this
  },

  transformSingle(shape, bounds, { initialShape, scaleX }) {
    shape.point = [bounds.minX, bounds.minY]
    shape.scale = initialShape.scale * Math.abs(scaleX)
    return this
  },

  onBoundsReset(shape) {
    shape.size = 'auto'
    return this
  },

  shouldDelete(shape) {
    return shape.text.length === 0
  },
})

export default text

const StyledText = styled('div', {
  width: '100%',
  height: '100%',
  border: 'none',
  padding: '4px',
  whiteSpace: 'pre',
  minHeight: 1,
  minWidth: 1,
  outline: 0,
  backgroundColor: 'transparent',
  overflow: 'hidden',
  pointerEvents: 'none',
  userSelect: 'none',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
  position: 'relative',
  zIndex: 0,
})

const StyledTextArea = styled('textarea', {
  width: '100%',
  height: '100%',
  border: 'none',
  padding: '4px',
  whiteSpace: 'pre',
  resize: 'none',
  minHeight: 1,
  minWidth: 1,
  outline: 0,
  backgroundColor: '$boundsBg',
  overflow: 'hidden',
  pointerEvents: 'all',
  backfaceVisibility: 'hidden',
  display: 'inline-block',
})
