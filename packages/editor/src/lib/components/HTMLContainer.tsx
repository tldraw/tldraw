import * as React from 'react'

/** @public */
export type HTMLContainerProps = React.HTMLAttributes<HTMLDivElement>

/** @public */
export function HTMLContainer({ children, className = '', ...rest }: HTMLContainerProps) {
	return (
		<div {...rest} className={`rs-html-container ${className}`}>
			{children}
		</div>
	)
}
