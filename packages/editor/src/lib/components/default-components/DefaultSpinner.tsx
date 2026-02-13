import classNames from 'classnames'

/** @public @react */
export function DefaultSpinner(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			width={16}
			height={16}
			viewBox="0 0 16 16"
			aria-hidden="false"
			{...props}
			className={classNames('tl-spinner', props.className)}
		>
			<g strokeWidth={2} fill="none" fillRule="evenodd">
				<circle strokeOpacity={0.25} cx={8} cy={8} r={7} stroke="currentColor" />
				<path strokeLinecap="round" d="M15 8c0-4.5-4.5-7-7-7" stroke="currentColor" />
			</g>
		</svg>
	)
}
