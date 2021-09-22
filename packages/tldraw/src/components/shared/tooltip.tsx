import * as RadixTooltip from '@radix-ui/react-tooltip'
import * as React from 'react'
import css from '~styles'
import { Kbd } from './kbd'

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
      <RadixTooltip.Trigger as="span">{children}</RadixTooltip.Trigger>
      <RadixTooltip.Content className={content()} side={side} sideOffset={8}>
        {label}
        {kbdProp ? <Kbd variant="tooltip">{kbdProp}</Kbd> : null}
        <RadixTooltip.Arrow className={arrow()} />
      </RadixTooltip.Content>
    </RadixTooltip.Root>
  )
}

const content = css({
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

const arrow = css({
  fill: '$tooltipBg',
  margin: '0 8px',
})
