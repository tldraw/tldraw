import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

export default function Develop() {
	const performanceOverrides = usePerformance()
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={[performanceOverrides]}
				persistenceKey="example"
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
				}}
				licenseKey="BDwy/DJ1CHh0Mm4p9d0B8D8eIP7Uh3ZGtWlm2+QrRR2EwIkRQ2vOhupNc1SvufO2OjvG3EAwluM0uGWgqvl0BXsiZXhwaXJ5IjoxODc3MDA1MDUyNTU2LCJjb21wYW55IjoiQWx0YXNpYW4iLCJob3N0cyI6WyJhdGxhc3NpYW4uY29tIiwiYXRsYXNzaWFuLm5ldCIsImxvY2FsaG9zdCJdfQ=="
			/>
		</div>
	)
}
