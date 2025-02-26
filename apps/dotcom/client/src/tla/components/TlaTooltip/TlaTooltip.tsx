/* eslint-disable no-restricted-syntax */
import * as Tooltip from '@radix-ui/react-tooltip'
import classNames from 'classnames'
import React from 'react'
import { useContainer } from 'tldraw'
import style from './tooltip.module.css'

export const TlaTooltipRoot: typeof Tooltip.Root = (props) => (
	<Tooltip.Root delayDuration={150} {...props} />
)

export const TlaTooltipTrigger = Tooltip.Trigger

export const TlaTooltipArrow: typeof Tooltip.Arrow = React.forwardRef((props, ref) => (
	<Tooltip.Arrow {...props} className={classNames(style.tooltipArrow, props.className)} ref={ref} />
))

export const TlaTooltipContent: typeof Tooltip.Content = React.forwardRef((props, ref) => (
	<Tooltip.Content
		avoidCollisions
		collisionPadding={8}
		sideOffset={4}
		dir="ltr"
		{...props}
		className={classNames('tlui-menu', style.tooltip)}
		ref={ref}
	/>
))

export const TlaTooltipPortal: typeof Tooltip.Portal = (props) => {
	const container = useContainer()
	return <Tooltip.Portal container={container} {...props} />
}
