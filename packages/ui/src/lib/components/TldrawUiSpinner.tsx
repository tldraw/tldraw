import classNames from 'classnames'

/** @public */
export interface TldrawUiSpinnerProps extends React.SVGProps<SVGSVGElement> {
	label?: string
}

/** @public @react */
export function TldrawUiSpinner({ label, ...props }: TldrawUiSpinnerProps) {
	return (
		<svg
			width={16}
			height={16}
			viewBox="0 0 16 16"
			aria-hidden={label ? undefined : true}
			aria-label={label}
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
