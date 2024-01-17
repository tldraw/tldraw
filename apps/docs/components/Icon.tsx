export function Icon({
	icon,
	className,
	small,
}: {
	small?: boolean
	icon: string
	className?: string
}) {
	return (
		<span
			className={`icon ${small ? 'small ' : ''}${className ?? ''}`}
			style={{
				mask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
				WebkitMask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
			}}
		/>
	)
}
