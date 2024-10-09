import classNames from 'classnames'
import * as React from 'react'
import { SafeId } from '../hooks/useSafeId'

/** @public */
export interface SVGContainerProps extends React.HTMLAttributes<SVGElement> {
	id?: SafeId
}

/** @public @react */
export function SVGContainer({ children, className = '', ...rest }: SVGContainerProps) {
	return (
		<svg {...rest} className={classNames('tl-svg-container', className)}>
			{children}
		</svg>
	)
}
