export function BlueA({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<a href={href} className="text-blue-500 hover:text-blue-600">
			{children}
		</a>
	)
}
