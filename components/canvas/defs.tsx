import { getShapeStyle } from 'state/shape-styles'
import { getShapeUtils } from 'state/shape-utils'
import React from 'react'
import { useSelector } from 'state'
import tld from 'utils/tld'
import { DotCircle, Handle } from './misc'
import useShapeDef from 'hooks/useShape'
import useShapesToRender from 'hooks/useShapesToRender'
import styled from 'styles'

export default function Defs(): JSX.Element {
  const shapeIdsToRender = useShapesToRender()

  return (
    <defs>
      <DotCircle id="dot" r={4} />
      <Handle id="handle" r={4} />
      <ExpandDef />
      <ShadowDef />
      {shapeIdsToRender.map((id) => (
        <Def key={id} id={id} />
      ))}
    </defs>
  )
}

function Def({ id }: { id: string }) {
  const shape = useShapeDef(id)

  if (!shape) return null

  const style = getShapeStyle(shape.style)

  return (
    <>
      {React.cloneElement(
        getShapeUtils(shape).render(shape, { isEditing: false }),
        { id, ...style, strokeWidth: undefined }
      )}
    </>
  )
}

function ExpandDef() {
  const zoom = useSelector((s) => tld.getCurrentCamera(s.data).zoom)

  return (
    <filter id="expand">
      <feMorphology operator="dilate" radius={2 / zoom} />
    </filter>
  )
}

function ShadowDef() {
  return (
    <filter id="hover">
      <StyledShadow dx="0" dy="0" stdDeviation="1.2" floodOpacity="1" />
    </filter>
  )
}

const StyledShadow = styled('feDropShadow', {
  floodColor: '$selected',
})
