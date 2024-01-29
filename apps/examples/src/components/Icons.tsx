export function StandaloneIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg width="16" height="16" viewBox="0 0 30 30" fill="none" {...props}>
			<path
				d="M13 5H7C5.89543 5 5 5.89543 5 7V23C5 24.1046 5.89543 25 7 25H23C24.1046 25 25 24.1046 25 23V17M19 5H25M25 5V11M25 5L13 17"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function Chevron() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="accordion__trigger__chevron"
		>
			<path
				d="M4 6L8 10L12 6"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
