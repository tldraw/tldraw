import * as RadixTooltip from '@radix-ui/react-tooltip'
import * as React from 'react'
import { Kbd } from '~components/Primitives/Kbd'
import { styled } from '~styles'

/* -------------------------------------------------- */
/*                       Tooltip                      */
/* -------------------------------------------------- */

interface TooltipProps {
  children: React.ReactNode
  label: string
  kbd?: string
  id?: string
  side?: 'bottom' | 'left' | 'right' | 'top'
}

export function Tooltip({
  children,
  label,
  kbd: kbdProp,
  id,
  side = 'top',
}: TooltipProps): JSX.Element {
  return (
    <span id={id}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger dir="ltr" asChild={true}>
          <span>{children}</span>
        </RadixTooltip.Trigger>
        <StyledContent dir="ltr" side={side} sideOffset={8}>
          {label}
          {kbdProp ? <Kbd variant="tooltip">{kbdProp}</Kbd> : null}
          <StyledArrow />
        </StyledContent>
      </RadixTooltip.Root>
    </span>
  )
}

const StyledContent = styled(RadixTooltip.Content, {
  borderRadius: 3,
  padding: '$3 $3 $3 $3',
  fontSize: '$1',
  backgroundColor: '$tooltip',
  color: '$tooltipContrast',
  boxShadow: '$3',
  display: 'flex',
  alignItems: 'center',
  fontFamily: '$ui',
  userSelect: 'none',
})

const StyledArrow = styled(RadixTooltip.Arrow, {
  fill: '$tooltip',
  margin: '0 8px',
})
