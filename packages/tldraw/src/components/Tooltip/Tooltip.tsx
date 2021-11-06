import * as RadixTooltip from '@radix-ui/react-tooltip'
import * as React from 'react'
import { Kbd } from '~components/Kbd'
import { styled } from '~styles'

/* -------------------------------------------------- */
/*                       Tooltip                      */
/* -------------------------------------------------- */

interface TooltipProps {
  children: React.ReactNode
  label: string
  kbd?: string
  side?: 'bottom' | 'left' | 'right' | 'top'
}

export function Tooltip({
  children,
  label,
  kbd: kbdProp,
  side = 'top',
}: TooltipProps): JSX.Element {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild={true}>
        <span>{children}</span>
      </RadixTooltip.Trigger>
      <StyledContent side={side} sideOffset={8}>
        {label}
        {kbdProp ? <Kbd variant="tooltip">{kbdProp}</Kbd> : null}
        <StyledArrow />
      </StyledContent>
    </RadixTooltip.Root>
  )
}

const StyledContent = styled(RadixTooltip.Content, {
  borderRadius: 3,
  padding: '$3 $3 $3 $3',
  fontSize: '$1',
  backgroundColor: '$tooltipBg',
  color: '$tooltipText',
  boxShadow: '$3',
  display: 'flex',
  alignItems: 'center',
  fontFamily: '$ui',
  userSelect: 'none',
})

const StyledArrow = styled(RadixTooltip.Arrow, {
  fill: '$tooltipBg',
  margin: '0 8px',
})
