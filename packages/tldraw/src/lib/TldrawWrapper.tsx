export type TldrawWrapperProps = {
	style?: React.CSSProperties
	className?: string
	children?: React.ReactNode
}

export function TldrawWrapper({ style, className, children }: TldrawWrapperProps) {
	return (
		<div style={style} className={`tl-wrapper ${className ?? ''}`}>
			{children}
		</div>
	)
}
