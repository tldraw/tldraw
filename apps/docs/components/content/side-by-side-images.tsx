import { Image } from './image'

export function SideBySideImages({ left, right }: { left: any; right: any }) {
	return (
		<span className="flex gap-8 sm:gap-2 flex-col sm:flex-row">
			<Image {...left} />
			<Image {...right} />
		</span>
	)
}
