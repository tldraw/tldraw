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
mdiv.style.margin = '0px'
mdiv.style.opacity = '0'
mdiv.style.position = 'absolute'
mdiv.style.top = '-500px'
mdiv.style.left = '0px'
mdiv.style.zIndex = '9999'
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
      size: 'auto',
      fontSize: FontSize.Medium,
      ...props,
    }
  },

  render(shape, { isEditing }) {
    const { id, text, style } = shape
    const styles = getShapeStyle(style)

    const font = getFontStyle(shape.fontSize, shape.style)
    const bounds = this.getBounds(shape)

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      state.send('EDITED_SHAPE', { change: { text: e.currentTarget.value } })
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
        <StyledText
          key={id}
          style={{
            font,
            color: styles.fill,
          }}
          value={text}
          onChange={handleChange}
          isEditing={isEditing}
          onFocus={(e) => e.currentTarget.select()}
        />
      </foreignObject>
    )
  },

  getBounds(shape) {
    const [minX, minY] = shape.point
    let width: number
    let height: number

    if (shape.size === 'auto') {
      // Calculate a size by rendering text into a div
      mdiv.innerHTML = shape.text + '&nbsp;'
      mdiv.style.font = getFontStyle(shape.fontSize, shape.style)
      ;[width, height] = [mdiv.offsetWidth, mdiv.offsetHeight]
    } else {
      // Use the shape's explicit size for width and height.
      ;[width, height] = shape.size
    }

    return {
      minX,
      maxX: minX + width,
      minY,
      maxY: minY + height,
      width,
      height,
    }
  },

  hitTest(shape, test) {
    return true
  },

  transform(shape, bounds, { initialShape, transformOrigin, scaleX, scaleY }) {
    if (shape.rotation === 0 && !shape.isAspectRatioLocked) {
      shape.size = [bounds.width, bounds.height]
      shape.point = [bounds.minX, bounds.minY]
    } else {
      if (initialShape.size === 'auto') return

      shape.size = vec.mul(
        initialShape.size,
        Math.min(Math.abs(scaleX), Math.abs(scaleY))
      )

      shape.point = [
        bounds.minX +
          (bounds.width - shape.size[0]) *
            (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY +
          (bounds.height - shape.size[1]) *
            (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1]),
      ]

      shape.rotation =
        (scaleX < 0 && scaleY >= 0) || (scaleY < 0 && scaleX >= 0)
          ? -initialShape.rotation
          : initialShape.rotation
    }

    return this
  },

  transformSingle(shape, bounds) {
    shape.size = [bounds.width, bounds.height]
    shape.point = [bounds.minX, bounds.minY]
    return this
  },

  onBoundsReset(shape) {
    shape.size = 'auto'
    return this
  },

  getShouldDelete(shape) {
    return shape.text.length === 0
  },
})

export default text

const StyledText = styled('textarea', {
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

  variants: {
    isEditing: {
      true: {
        backgroundColor: '$boundsBg',
        pointerEvents: 'all',
      },
    },
  },
})
