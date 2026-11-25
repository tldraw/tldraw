import type { SVGProps } from 'react'

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
			<path
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-.691 3.516a4.5 4.5 0 1 1 .707-.707l2.838 2.837a.5.5 0 0 1-.708.708z"
			/>
		</svg>
	)
}
