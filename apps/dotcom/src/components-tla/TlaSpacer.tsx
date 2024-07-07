export function TlaSpacer({
	height = 'full',
	width = 'full',
}: {
	height?: number | string
	width?: number | string
}) {
	return <div className={`tla_spacer tla_height_${height} tla_width_${width}`} />
}
