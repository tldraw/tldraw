import type { SVGProps } from 'react'
import { useUniqueSafeId } from 'tldraw'

function LibraryShapes() {
	return (
		<>
			<rect width="8" height="18" x="3" y="3" rx="1" />
			<path d="M7 3v18" />
			<path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z" />
		</>
	)
}

function IconSvg(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		/>
	)
}

export function LibraryIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<IconSvg {...props}>
			<LibraryShapes />
		</IconSvg>
	)
}

export function NewLibraryIcon(props: SVGProps<SVGSVGElement>) {
	const maskId = useUniqueSafeId()
	return (
		<IconSvg {...props}>
			<mask id={maskId}>
				<rect width="24" height="24" fill="white" stroke="none" />
				<circle cx="18" cy="18" r="6.5" fill="black" stroke="none" />
			</mask>
			<g mask={`url(#${maskId})`}>
				<LibraryShapes />
			</g>
			<path d="M18 14v8M14 18h8" />
		</IconSvg>
	)
}
