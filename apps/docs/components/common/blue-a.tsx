export function BlueA({
	href,
	newTab = false,
	children,
}: {
	href: string
	newTab?: boolean
	children: React.ReactNode
}) {
	return (
		<a
			href={href}
			target={newTab ? '_blank' : undefined}
			rel={newTab ? 'noreferrer' : undefined}
			className="text-blue-500 hover:text-blue-600"
		>
			{children}
		</a>
	)
}
