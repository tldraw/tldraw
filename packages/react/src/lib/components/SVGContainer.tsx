import * as React from 'react'

/** @public */
export type SVGContainerProps = React.HTMLAttributes<SVGElement>

/** @public */
export function SVGContainer({ children, className = '', ...rest }: SVGContainerProps) {
	return (
		<svg {...rest} className={`tl-svg-container ${className}`}>
			{children}
		</svg>
	)
}
