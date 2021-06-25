import { uniqueId, isMobile } from 'utils'
import vec from 'utils/vec'
import { TextShape, ShapeType, FontSize } from 'types'
import {
  defaultStyle,
  getFontSize,
  getFontStyle,
  getShapeStyle,
} from 'state/shape-styles'
import styled from 'styles'
import state from 'state'
import { registerShapeUtils } from './register'

// A div used for measurement

if (document.getElementById('__textMeasure')) {
  document.getElementById('__textMeasure').remove()
}

// A div used for measurement
const mdiv = document.createElement('pre')
mdiv.id = '__textMeasure'

Object.assign(mdiv.style, {
  whiteSpace: 'pre',
  width: 'auto',
  border: '1px solid red',
  padding: '4px',
  margin: '0px',
  opacity: '0',
  position: 'absolute',
  top: '-500px',
  left: '0px',
  zIndex: '9999',
  pointerEvents: 'none',
})

mdiv.tabIndex = -1

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
      fontSize: FontSize.Medium,
      ...props,
    }
  },

  render(shape, { isEditing, ref }) {
    const { id, text, style } = shape
    const styles = getShapeStyle(style)
    const font = getFontStyle(shape.scale, shape.style)

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

    const fontSize = getFontSize(shape.style.size) * shape.scale
    const gap = fontSize * 0.4

    if (!isEditing) {
      return (
        <g id={id} pointerEvents="none">
          {text.split('\n').map((str, i) => (
            <text
              key={i}
              x={4}
              y={4 + gap / 2 + i * (fontSize + gap)}
              fontFamily="Verveine Regular"
              fontStyle="normal"
              fontWeight="regular"
              fontSize={fontSize}
              width={bounds.width}
              height={bounds.height}
              dominantBaseline="hanging"
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
        <StyledTextArea
          ref={ref}
          style={{
            font,
            color: styles.stroke,
          }}
          value={text}
          tabIndex={0}
          autoComplete="false"
          autoCapitalize="false"
          autoCorrect="false"
          autoSave="false"
          placeholder=""
          name="text"
          autoFocus={isMobile() ? true : false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
        />
      </foreignObject>
    )
  },

  getBounds(shape) {
    if (!this.boundsCache.has(shape)) {
      mdiv.innerHTML = shape.text + '&zwj;'
      mdiv.style.font = getFontStyle(shape.scale, shape.style)

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

  hitTest() {
    return true
  },

  transform(shape, bounds, { initialShape, scaleX, scaleY }) {
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
    const center = this.getCenter(shape)

    this.boundsCache.delete(shape)

    shape.scale = 1

    const newCenter = this.getCenter(shape)

    shape.point = vec.add(shape.point, vec.sub(center, newCenter))

    return this
  },

  applyStyles(shape, style) {
    const center = this.getCenter(shape)

    this.boundsCache.delete(shape)

    Object.assign(shape.style, style)

    const newCenter = this.getCenter(shape)

    shape.point = vec.add(shape.point, vec.sub(center, newCenter))

    return this
  },

  shouldDelete(shape) {
    return shape.text.length === 0
  },
})

export default text

const StyledTextArea = styled('textarea', {
  zIndex: 1,
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
  userSelect: 'text',
  WebkitUserSelect: 'text',
  WebkitTouchCallout: 'none',
})
