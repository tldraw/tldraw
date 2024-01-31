import { memo } from 'react'

export type TldrawWrapperProps = {
	style?: React.CSSProperties
	className?: string
	children?: React.ReactNode
}

export const TldrawWrapper = memo(({ style, className, children }: TldrawWrapperProps) => {
	return (
		<div style={style} className={`tl-wrapper ${className ?? ''}`}>
			{children}
		</div>
	)
})
