import classNames from 'classnames'
import * as React from 'react'

/** @public */
export type HTMLContainerProps = React.HTMLAttributes<HTMLDivElement>

/** @public @react */
export function HTMLContainer({ children, className = '', ...rest }: HTMLContainerProps) {
	return (
		<div {...rest} className={classNames('tl-html-container', className)}>
			{children}
		</div>
	)
}
