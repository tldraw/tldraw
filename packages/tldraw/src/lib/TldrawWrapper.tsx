import { memo } from 'react'

/** @public */
export type TldrawWrapperProps = {
	style?: React.CSSProperties
	className?: string
	children?: React.ReactNode
}

/** @public */
export const TldrawWrapper = memo(({ style, className, children }: TldrawWrapperProps) => {
	return (
		<div style={style} className={`tl-wrapper ${className ?? ''}`}>
			{children}
		</div>
	)
})
