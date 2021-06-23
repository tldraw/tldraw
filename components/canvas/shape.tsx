import React, { useRef, memo, useEffect } from 'react'
import { useSelector } from 'state'
import styled from 'styles'
import { getShapeUtils } from 'state/shape-utils'
import { getPage, getSelectedIds, isMobile } from 'utils/utils'
import { Shape as _Shape } from 'types'
import useShapeEvents from 'hooks/useShapeEvents'
import vec from 'utils/vec'
import { getShapeStyle } from 'state/shape-styles'

const isMobileDevice = isMobile()

interface ShapeProps {
  id: string
  isSelecting: boolean
  parentPoint: number[]
}

function Shape({ id, isSelecting, parentPoint }: ShapeProps): JSX.Element {
  const rGroup = useRef<SVGGElement>(null)
  const rFocusable = useRef<HTMLTextAreaElement>(null)

  const isEditing = useSelector((s) => s.data.editingId === id)

  const isSelected = useSelector((s) => getSelectedIds(s.data).has(id))

  const shape = useSelector((s) => getPage(s.data).shapes[id])

  const events = useShapeEvents(id, getShapeUtils(shape)?.isParent, rGroup)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        const elm = rFocusable.current
        if (!elm) return
        elm.focus()
      }, 0)
    }
  }, [isEditing])

  // This is a problem with deleted shapes. The hooks in this component
  // may sometimes run before the hook in the Page component, which means
  // a deleted shape will still be pulled here before the page component
  // detects the change and pulls this component.
  if (!shape) return null

  const style = getShapeStyle(shape.style)
  const shapeUtils = getShapeUtils(shape)

  const { isShy, isParent, isForeignObject } = shapeUtils

  const bounds = shapeUtils.getBounds(shape)
  const center = shapeUtils.getCenter(shape)
  const rotation = shape.rotation * (180 / Math.PI)

  const transform = `
    translate(${vec.neg(parentPoint)})
    rotate(${rotation}, ${center})
    translate(${shape.point})
  `

  return (
    <StyledGroup
      id={id + '-group'}
      ref={rGroup}
      transform={transform}
      isSelected={isSelected}
      device={isMobileDevice ? 'mobile' : 'desktop'}
      {...events}
    >
      {!isShy && (
        <>
          {isForeignObject ? (
            <HoverIndicator
              as="rect"
              width={bounds.width}
              height={bounds.height}
              strokeWidth={1.5}
              variant={'ghost'}
            />
          ) : (
            <HoverIndicator
              as="use"
              href={'#' + id}
              strokeWidth={+style.strokeWidth + 5}
              variant={getShapeUtils(shape).canStyleFill ? 'filled' : 'hollow'}
            />
          )}
        </>
      )}

      {!shape.isHidden &&
        (isForeignObject ? (
          shapeUtils.render(shape, { isEditing, ref: rFocusable })
        ) : (
          <RealShape
            isParent={isParent}
            id={id}
            shape={shape}
            style={style}
            isEditing={isEditing}
          />
        ))}

      {isParent &&
        shape.children.map((shapeId) => (
          <Shape
            key={shapeId}
            id={shapeId}
            isSelecting={isSelecting}
            parentPoint={shape.point}
          />
        ))}
    </StyledGroup>
  )
}

interface RealShapeProps {
  id: string
  style: Partial<React.SVGProps<SVGUseElement>>
  isParent: boolean
  shape: _Shape
  isEditing: boolean
}

const RealShape = memo(function RealShape({ id, isParent }: RealShapeProps) {
  return <StyledShape as="use" data-shy={isParent} href={'#' + id} />
})

const StyledShape = styled('path', {
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pointerEvents: 'none',
})

const HoverIndicator = styled('path', {
  stroke: '$selected',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'transparent',
  filter: 'url(#expand)',
  variants: {
    variant: {
      ghost: {
        pointerEvents: 'all',
        filter: 'none',
        opacity: 0,
      },
      hollow: {
        pointerEvents: 'stroke',
      },
      filled: {
        pointerEvents: 'all',
      },
    },
  },
})

const StyledGroup = styled('g', {
  outline: 'none',
  [`& *[data-shy="true"]`]: {
    opacity: '0',
  },
  [`& ${HoverIndicator}`]: {
    opacity: '0',
  },
  variants: {
    device: {
      mobile: {},
      desktop: {},
    },
    isSelected: {
      true: {
        [`& *[data-shy="true"]`]: {
          opacity: '1',
        },
        [`& ${HoverIndicator}`]: {
          opacity: '0.2',
        },
      },
      false: {
        [`& ${HoverIndicator}`]: {
          opacity: '0',
        },
      },
    },
  },
  compoundVariants: [
    {
      device: 'desktop',
      isSelected: 'false',
      css: {
        [`&:hover ${HoverIndicator}`]: {
          opacity: '0.16',
        },
        [`&:hover *[data-shy="true"]`]: {
          opacity: '1',
        },
      },
    },
    {
      device: 'desktop',
      isSelected: 'true',
      css: {
        [`&:hover ${HoverIndicator}`]: {
          opacity: '0.25',
        },
        [`&:active ${HoverIndicator}`]: {
          opacity: '0.25',
        },
      },
    },
  ],
})

// function Label({ children }: { children: React.ReactNode }) {
//   return (
//     <text
//       y={4}
//       x={4}
//       fontSize={12}
//       fill="black"
//       stroke="none"
//       alignmentBaseline="text-before-edge"
//       pointerEvents="none"
//     >
//       {children}
//     </text>
//   )
// }

// function pp(n: number[]) {
//   return '[' + n.map((v) => v.toFixed(1)).join(', ') + ']'
// }

export { HoverIndicator }

export default memo(Shape)
