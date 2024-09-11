import { cn } from '@/utils/cn'

export function SectionHeading({
	heading,
	subheading,
	description,
}: {
	heading: string
	subheading?: string
	description?: React.ReactNode
}) {
	return (
		<>
			{subheading && (
				<div className="uppercase tracking-wider text-blue-500 font-bold text-xs text-center px-5 md:px-0">
					{subheading}
				</div>
			)}
			<h2
				className={cn(
					'text-black dark:text-white font-black text-2xl sm:text-3xl md:text-4xl text-center px-5 md:px-0',
					subheading && 'mt-2 md:mt-3',
					description ? 'mb-6' : 'mb-12'
				)}
			>
				{heading}
			</h2>
			{description && (
				<p className="text-center max-w-lg text-balance mb-16 mx-auto px-5 md:px-0">
					{description}
				</p>
			)}
		</>
	)
}
