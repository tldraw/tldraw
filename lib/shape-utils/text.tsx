import { uniqueId } from 'utils/utils'
import vec from 'utils/vec'
import { TextShape, ShapeType, FontSize } from 'types'
import { registerShapeUtils } from './index'
import { defaultStyle, getFontStyle, getShapeStyle } from 'lib/shape-styles'
import styled from 'styles'
import state from 'state'
import { useEffect, useRef } from 'react'

// A div used for measurement

if (document.getElementById('__textMeasure')) {
  document.getElementById('__textMeasure').remove()
}

const mdiv = document.createElement('pre')
mdiv.id = '__textMeasure'
mdiv.style.whiteSpace = 'pre'
mdiv.style.width = 'auto'
mdiv.style.border = '1px solid red'
mdiv.style.padding = '4px'
mdiv.style.lineHeight = '1'
mdiv.style.margin = '0px'
mdiv.style.opacity = '0'
mdiv.style.position = 'absolute'
mdiv.style.top = '-500px'
mdiv.style.left = '0px'
mdiv.style.zIndex = '9999'
mdiv.setAttribute('readonly', 'true')
document.body.appendChild(mdiv)

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
            value={text}
            autoComplete="false"
            autoCapitalize="false"
            autoCorrect="false"
            onFocus={(e) => {
              e.currentTarget.select()
              state.send('FOCUSED_EDITING_SHAPE')
            }}
            onBlur={() => {
              state.send('BLURRED_EDITING_SHAPE')
            }}
            onChange={(e) => {
              state.send('EDITED_SHAPE', {
                change: { text: e.currentTarget.value },
              })
            }}
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
      mdiv.innerHTML = shape.text || ' ' // + '&nbsp;'
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
  resize: 'none',
  minHeight: 1,
  minWidth: 1,
  outline: 'none',
  backgroundColor: 'transparent',
  overflow: 'hidden',
  pointerEvents: 'none',
  userSelect: 'none',
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
  outline: 'none',
  overflow: 'hidden',
  backgroundColor: '$boundsBg',
  pointerEvents: 'all',
})
