export function TlaSpacer({
	height = 'full',
	width = 'full',
}: {
	height?: number | string
	width?: number | string
}) {
	return <div className={`tla-spacer tla-height_${height} tla-width_${width}`} />
}
