import { useEditor, useValue } from '@tldraw/editor'
import { Tooltip as _Tooltip } from 'radix-ui'
import React from 'react'

/** @public */
export interface TldrawUiTooltipProps {
	children: React.ReactNode
	content?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	sideOffset?: number
	disabled?: boolean
}

/** @public @react */
export function TldrawUiTooltip({
	children,
	content,
	side = 'bottom',
	sideOffset = 5,
	disabled = false,
}: TldrawUiTooltipProps) {
	const editor = useEditor()
	const showUiLabels = useValue('showUiLabels', () => editor.user.getShowUiLabels(), [editor])

	// Don't show tooltip if disabled, no content, or UI labels are disabled
	if (disabled || !content || !showUiLabels) {
		return <>{children}</>
	}

	return (
		<_Tooltip.Root delayDuration={300} disableHoverableContent>
			<_Tooltip.Trigger asChild>{children}</_Tooltip.Trigger>
			<_Tooltip.Content className="tlui-tooltip" side={side} sideOffset={sideOffset}>
				{content}
				<_Tooltip.Arrow className="tlui-tooltip__arrow" />
			</_Tooltip.Content>
		</_Tooltip.Root>
	)
}
