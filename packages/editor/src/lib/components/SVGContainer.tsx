import classNames from 'classnames'
import * as React from 'react'

/** @public */
export type SVGContainerProps = React.ComponentProps<'svg'>

/** @public @react */
export function SVGContainer({ children, className = '', ...rest }: SVGContainerProps) {
	return (
		<svg {...rest} className={classNames('tl-svg-container', className)}>
			{children}
		</svg>
	)
}
