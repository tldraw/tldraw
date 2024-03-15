import classNames from 'classnames'

export function Chevron({ className }: { className?: string }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={classNames('accordion__trigger__chevron', className)}
		>
			<path
				d="M4 6L8 10L12 6"
				stroke="currentColor"
				strokeWidth="1"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
