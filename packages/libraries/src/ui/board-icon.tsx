import type { SVGProps } from 'react'

/**
 * A page with a folded corner, for an owner that is a board, e.g. as a {@link TLLibraryOwner}'s
 * `icon`.
 * @public @react
 */
export function BoardIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
			<path
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M3.705 2a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V6h-3.5a.5.5 0 0 1-.5-.5V2zm5.5.707L11.498 5H9.205zm-7-.207a1.5 1.5 0 0 1 1.5-1.5h5a.5.5 0 0 1 .354.146l4 4a.5.5 0 0 1 .146.354v7a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5z"
			/>
		</svg>
	)
}
