export function Icon({ icon, className }: { icon: string; className?: string }) {
	return (
		<span
			className={`icon ${className ?? ''}`}
			style={{
				mask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
				WebkitMask: `url(/icons/${icon}.svg) center 100% / 100% no-repeat`,
			}}
		/>
	)
}
