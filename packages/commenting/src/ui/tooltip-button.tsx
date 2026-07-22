import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { TldrawUiTooltip } from 'tldraw'

interface TooltipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	tooltip: string
}

/** An icon button labelled by a styled tooltip. Forwards ref and props to the underlying button
 *  so `asChild` triggers (dropdown, tooltip) both compose onto the real element. */
export const TooltipButton = forwardRef<HTMLButtonElement, TooltipButtonProps>(
	function TooltipButton({ tooltip, children, ...props }, ref) {
		return (
			<TldrawUiTooltip content={tooltip}>
				<button ref={ref} type="button" aria-label={tooltip} {...props}>
					{children}
				</button>
			</TldrawUiTooltip>
		)
	}
)
