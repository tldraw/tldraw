import styled from 'styles'

export const DotCircle = styled('circle', {
  transform: 'scale(var(--scale))',
  strokeWidth: '2',
})

export const Handle = styled('circle', {
  transform: 'scale(var(--scale))',
  fill: '$canvas',
  stroke: '$selected',
  strokeWidth: '2',
})

export const ThinLine = styled('line', {
  zStrokeWidth: 1,
})

export const BindingIndicator = styled('path', {
  fill: '$brushFill',
  stroke: '$brushStroke',
  zStrokeWidth: 1,
  pointerEvents: 'none',
})
