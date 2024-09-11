export function BisectButton({
	emphasize = false,
	text,
	title,
	type = 'regular',
	onClick,
}: {
	emphasize?: boolean
	text: string
	title?: string
	type?: 'regular' | 'emoji'
	onClick(): void
}) {
	const regular = type === 'regular'
	return (
		<button
			className="bisect__button"
			style={{
				backgroundColor: regular ? '#3182ED' : 'transparent',
				color: regular ? 'white' : 'black',
				padding: regular ? '10px' : 0,
				borderRadius: regular ? '5px' : 0,
				fontSize: emphasize ? '1.2em' : undefined,
			}}
			title={title}
			onClick={onClick}
		>
			{text}
		</button>
	)
}
