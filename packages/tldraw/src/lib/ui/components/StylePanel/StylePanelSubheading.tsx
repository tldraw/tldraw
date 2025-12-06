/** @public */
export interface StylePanelSubheadingProps {
	children: React.ReactNode
}

/** @public @react */
export function StylePanelSubheading({ children }: StylePanelSubheadingProps) {
	return <h3 className="tlui-style-panel__subheading">{children}</h3>
}
