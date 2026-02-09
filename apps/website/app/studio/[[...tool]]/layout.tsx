export const metadata = {
	title: 'Sanity Studio',
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
	return <div style={{ margin: 0, height: '100vh' }}>{children}</div>
}
