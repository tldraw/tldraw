import { HTMLAttributes } from 'react'

export function TlaDivider({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...props} className={`tla-divider ${props.className ?? ''}`}>
			{children && <span>{children}</span>}
		</div>
	)
}
