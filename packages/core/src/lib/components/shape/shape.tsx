import * as React from 'react'
import { useShapeEvents, useTLState } from '../../hooks'
import Utils from '../../utils'
import styled from '../../styles'
import { TLShape } from '../../types'
import { RenderedShape } from './rendered-shape'
import { EditingTextShape } from './editing-text-shape'

interface ShapeProps {
  shape: TLShape
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

export const Shape = React.memo(
  ({
    shape,
    isEditing,
    isHovered,
    isSelected,
    isBinding,
    isDarkMode,
    isCurrentParent,
  }: ShapeProps) => {
    const state = useTLState()
    const rGroup = React.useRef<SVGGElement>(null)
    const events = useShapeEvents(shape.id, isCurrentParent, rGroup)
    const utils = state.getShapeUtils(shape)

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
        {isEditing && shape.type === 'text' ? ( // TODO: Refactor to "isEditableText" ?
          <EditingTextShape
            shape={shape}
            isBinding={false}
            isCurrentParent={false}
            isDarkMode={isDarkMode}
            isEditing={true}
            isHovered={false}
            isSelected={false}
            utils={utils}
          />
        ) : (
          <RenderedShape
            shape={shape}
            utils={utils}
            isBinding={isBinding}
            isCurrentParent={isCurrentParent}
            isDarkMode={isDarkMode}
            isEditing={isEditing}
            isHovered={isHovered}
            isSelected={isSelected}
          />
        )}
      </ShapeGroup>
    )
  },
  Utils.shallowEqual
)

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
