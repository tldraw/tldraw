import { uniqueId, isMobile } from 'utils/utils'
import vec from 'utils/vec'
import TextAreaUtils from 'utils/text-area'
import { TextShape, ShapeType } from 'types'
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
  userSelect: 'none',
  alignmentBaseline: 'mathematical',
  dominantBaseline: 'mathematical',
})

mdiv.tabIndex = -1

document.body.appendChild(mdiv)

function normalizeText(text: string) {
  return text.replace(/\r?\n|\r/g, '\n')
}

const text = registerShapeUtils<TextShape>({
  isForeignObject: true,
  canChangeAspectRatio: false,
  canEdit: true,
  boundsCache: new WeakMap([]),

  defaultProps: {
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
  },

  shouldRender(shape, prev) {
    return (
      shape.text !== prev.text ||
      shape.scale !== prev.scale ||
      shape.style !== prev.style
    )
  },

  render(shape, { isEditing, ref }) {
    const { id, text, style } = shape
    const styles = getShapeStyle(style)
    const font = getFontStyle(shape.scale, shape.style)

    const bounds = this.getBounds(shape)

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      state.send('EDITED_SHAPE', {
        id,
        change: { text: normalizeText(e.currentTarget.value) },
      })
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === 'Escape') return

      e.stopPropagation()

      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          TextAreaUtils.unindent(e.currentTarget)
        } else {
          TextAreaUtils.indent(e.currentTarget)
        }

        state.send('EDITED_SHAPE', {
          id,
          change: {
            text: normalizeText(e.currentTarget.value),
          },
        })
      }
    }

    function handleBlur() {
      setTimeout(() => state.send('BLURRED_EDITING_SHAPE', { id }), 0)
    }

    function handleFocus(e: React.FocusEvent<HTMLTextAreaElement>) {
      e.currentTarget.select()
      state.send('FOCUSED_EDITING_SHAPE', { id })
    }

    function handlePointerDown(e: React.PointerEvent<HTMLTextAreaElement>) {
      if (e.currentTarget.selectionEnd !== 0) {
        e.currentTarget.selectionEnd = 0
      }
    }

    const fontSize = getFontSize(shape.style.size) * shape.scale
    const lineHeight = fontSize * 1.4

    if (!isEditing) {
      return (
        <g id={id} pointerEvents="none">
          {text.split('\n').map((str, i) => (
            <text
              key={i}
              x={4}
              y={4 + fontSize / 2 + i * lineHeight}
              fontFamily="Verveine Regular"
              fontStyle="normal"
              fontWeight="regular"
              fontSize={fontSize}
              width={bounds.width}
              height={bounds.height}
              fill={styles.stroke}
              color={styles.stroke}
              stroke={styles.stroke}
              xmlSpace="preserve"
              dominantBaseline="mathematical"
              alignmentBaseline="mathematical"
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
          name="text"
          defaultValue={text}
          tabIndex={-1}
          autoComplete="false"
          autoCapitalize="false"
          autoCorrect="false"
          autoSave="false"
          placeholder=""
          color={styles.stroke}
          autoFocus={isMobile() ? true : false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
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
  alignmentBaseline: 'mathematical',
  dominantBaseline: 'mathematical',
  resize: 'none',
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1.4,
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
