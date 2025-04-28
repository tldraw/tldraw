/* eslint-disable no-restricted-syntax */
import classNames from 'classnames'
import { Tooltip as _Tooltip } from 'radix-ui'
import React from 'react'
import { useContainer } from 'tldraw'
import style from './tooltip.module.css'

export const TlaTooltipRoot: typeof _Tooltip.Root = (props) => (
	<_Tooltip.Root delayDuration={150} {...props} />
)

export const TlaTooltipTrigger = _Tooltip.Trigger

export const TlaTooltipArrow: typeof _Tooltip.Arrow = React.forwardRef((props, ref) => (
	<_Tooltip.Arrow
		{...props}
		className={classNames(style.tooltipArrow, props.className)}
		ref={ref}
	/>
))

export const TlaTooltipContent: typeof _Tooltip.Content = React.forwardRef((props, ref) => (
	<_Tooltip.Content
		avoidCollisions
		collisionPadding={8}
		sideOffset={4}
		dir="ltr"
		{...props}
		className={classNames('tlui-menu', style.tooltip)}
		ref={ref}
	/>
))

export const TlaTooltipPortal: typeof _Tooltip.Portal = (props) => {
	const container = useContainer()
	return <_Tooltip.Portal container={container} {...props} />
}
