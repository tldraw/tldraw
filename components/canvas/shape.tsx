import useShapeEvents from 'hooks/useShapeEvents'
import { Shape as _Shape, ShapeType, TextShape } from 'types'
import { getShapeUtils } from 'state/shape-utils'
import { shallowEqual } from 'utils'
import { memo, useRef } from 'react'
import styled from 'styles'

interface ShapeProps {
  shape: _Shape
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

const Shape = memo(
  ({
    shape,
    isEditing,
    isHovered,
    isSelected,
    isBinding,
    isDarkMode,
    isCurrentParent,
  }: ShapeProps) => {
    const rGroup = useRef<SVGGElement>(null)
    const events = useShapeEvents(shape.id, isCurrentParent, rGroup)
    const utils = getShapeUtils(shape)

    const center = utils.getCenter(shape)
    const rotation = shape.rotation * (180 / Math.PI)
    const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`

    return (
      <ShapeGroup
        ref={rGroup}
        id={shape.id}
        transform={transform}
        isCurrentParent={isCurrentParent}
        filter={isHovered ? 'url(#expand)' : 'none'}
        {...events}
      >
        {isEditing && shape.type === ShapeType.Text ? (
          <EditingTextShape shape={shape} isDarkMode={isDarkMode} />
        ) : (
          <RenderedShape
            shape={shape}
            isEditing={isEditing}
            isHovered={isHovered}
            isSelected={isSelected}
            isDarkMode={isDarkMode}
            isBinding={isBinding}
            isCurrentParent={isCurrentParent}
          />
        )}
      </ShapeGroup>
    )
  },
  shallowEqual
)

export default Shape

interface RenderedShapeProps {
  shape: _Shape
  isEditing: boolean
  isHovered: boolean
  isBinding: boolean
  isSelected: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

const RenderedShape = memo(
  function RenderedShape({
    shape,
    isEditing,
    isHovered,
    isBinding,
    isSelected,
    isDarkMode,
    isCurrentParent,
  }: RenderedShapeProps) {
    return getShapeUtils(shape).render(shape, {
      isEditing,
      isHovered,
      isSelected,
      isBinding,
      isDarkMode,
      isCurrentParent,
    })
  },
  (prev, next) => {
    if (
      prev.isEditing !== next.isEditing ||
      prev.isHovered !== next.isHovered ||
      prev.isSelected !== next.isSelected ||
      prev.isDarkMode !== next.isDarkMode ||
      prev.isBinding !== next.isBinding ||
      prev.isCurrentParent !== next.isCurrentParent
    ) {
      return false
    }

    if (next.shape !== prev.shape) {
      return !getShapeUtils(next.shape).shouldRender(next.shape, prev.shape)
    }

    return true
  }
)

function EditingTextShape({
  shape,
  isDarkMode,
}: {
  shape: TextShape
  isDarkMode: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  return getShapeUtils(shape).render(shape, {
    ref,
    isEditing: true,
    isHovered: false,
    isSelected: false,
    isDarkMode,
    isCurrentParent: false,
  })
}

const ShapeGroup = styled('g', {
  outline: 'none',

  '& > *[data-shy=true]': {
    opacity: 0,
  },

  '&:hover': {
    '& > *[data-shy=true]': {
      opacity: 1,
    },
  },

  variants: {
    isCurrentParent: {
      true: {
        '& > *[data-shy=true]': {
          opacity: 1,
        },
      },
    },
  },
})
