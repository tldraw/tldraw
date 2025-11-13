export function SmallSpinner(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			width={11}
			height={11}
			viewBox="0 0 11 11"
			aria-hidden="false"
			{...props}
			className="tl-spinner"
		>
			<g strokeWidth={2} fill="none" fillRule="evenodd">
				<circle strokeOpacity={0.25} cx={5.5} cy={5.5} r={4.5} stroke="currentColor" />
				<path strokeLinecap="round" d="M10.5 5.5c0-2.5-2.5-4.5-4.5-4.5" stroke="currentColor" />
			</g>
		</svg>
	)
}
