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
	return (
		<button
			className={`bisect__button bisect__button-${type}`}
			style={{
				fontSize: emphasize ? '1.2em' : undefined,
			}}
			title={title}
			onClick={onClick}
		>
			{text}
		</button>
	)
}
