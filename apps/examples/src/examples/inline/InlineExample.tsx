import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function InlineExample() {
	return (
		<>
			<InlineEditor width={400} height={300} />
			<InlineEditor width={500} height={300} />
			<InlineEditor width={600} height={400} />
			<InlineEditor width={700} height={500} />
			<InlineEditor width={900} height={600} />
		</>
	)
}

function InlineEditor({ width, height }: { width: number; height: number }) {
	const title = `${width} x ${height}`
	return (
		<section style={{ padding: '12px 32px' }}>
			<h2>{title}</h2>
			<div style={{ width, height }}>
				<Tldraw persistenceKey="inset-size-example" />
			</div>
		</section>
	)
}
