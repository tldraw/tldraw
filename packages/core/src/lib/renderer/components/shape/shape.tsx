import * as React from 'react'
import { useShapeEvents, useTLContext } from '../../hooks'
import { Utils } from '../../../utils'
import { TLShape } from '../../../types'
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
    const { shapeUtils } = useTLContext()
    const rGroup = React.useRef<SVGGElement>(null)
    const events = useShapeEvents(shape.id, isCurrentParent, rGroup)
    const utils = shapeUtils[shape.type]

    const center = utils.getCenter(shape)
    const rotation = (shape.rotation || 0) * (180 / Math.PI)
    const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`

    return (
      <g
        ref={rGroup}
        id={shape.id}
        transform={transform}
        filter={isHovered ? 'url(#expand)' : 'none'}
        {...events}
      >
        {isEditing && utils.isEditableText ? (
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
      </g>
    )
  },
  Utils.shallowEqual
)
