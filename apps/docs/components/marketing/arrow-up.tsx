import { cn } from '@/utils/cn'
import { useUniqueSafeId } from 'tldraw'

export function ArrowUp({ className }: { className?: string }) {
	const id = useUniqueSafeId()
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			direction="ltr"
			viewBox="329.875 380.3359375 106.828125 108.54933440266683"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn('stroke-current', className)}
		>
			<g transform="matrix(1, 0, 0, 1, 347.5742, 459.043)" opacity="1">
				<g transform="scale(1)">
					<defs>
						<mask id={id}>
							<rect x="-85.6992" y="-146.707" width="242.8281" height="244.5493" fill="white" />
						</mask>
					</defs>
					<g
						fill="none"
						strokeWidth="3.5"
						strokeLinejoin="round"
						strokeLinecap="round"
						pointerEvents="none"
					>
						<g mask={`url(#${id})`}>
							<rect x="-85.6992" y="-146.707" width="242.8281" height="244.5493" opacity="0" />
							<path
								d="M14.30078125,-2.1576968473331704 A114.9123956781845 114.9123956781845 0 0 0 57.12890625,-46.70703125"
								strokeDasharray="none"
								strokeDashoffset="none"
							/>
						</g>
						<path d="M 47.95501420648267 -41.59922303375993 L 57.12890625 -46.70703125 L 56.965451901164116 -36.20830358061802" />
					</g>
				</g>
			</g>
		</svg>
	)
}
