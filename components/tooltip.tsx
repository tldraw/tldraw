import * as _Tooltip from '@radix-ui/react-tooltip'
import React from 'react'
import styled from 'styles'

export default function Tooltip({
  children,
  label,
  side = 'top',
}: {
  children: React.ReactNode
  label: string
  side?: 'bottom' | 'left' | 'right' | 'top'
}): JSX.Element {
  return (
    <_Tooltip.Root>
      <_Tooltip.Trigger as="span">{children}</_Tooltip.Trigger>
      <StyledContent side={side} sideOffset={8}>
        {label}
        <StyledArrow />
      </StyledContent>
    </_Tooltip.Root>
  )
}

const StyledContent = styled(_Tooltip.Content, {
  borderRadius: 3,
  padding: '6px 12px',
  fontSize: '$1',
  backgroundColor: '$text',
  color: '$panel',
})

const StyledArrow = styled(_Tooltip.Arrow, {
  fill: '$text',
  margin: '0 8px',
})
