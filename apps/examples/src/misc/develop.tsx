import { getLicenseKey } from '@tldraw/dotcom-shared'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

export default function Develop() {
	const performanceOverrides = usePerformance()
	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				overrides={[performanceOverrides]}
				persistenceKey="example"
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
				}}
			/>
		</div>
	)
}
