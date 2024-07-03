import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

const licenseKey =
	'tldraw-tldraw-2025-07-03/WyJmcHlRZ1VzZyIsWyIqLnRsZHJhdy5jb20iXSwxLCIyLjMuMCIsIjIwMjUtMDctMDMiXQ==.DV8kOkKsSxZUngDL8oWEIQwgfVIBVhpgwgd/j+bxTQ7h+DVZ7R4oY9u1JDpvaLnwzbKX2LniFHiS8NUV4kqZoQ=='

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
				licenseKey={licenseKey}
			/>
		</div>
	)
}
