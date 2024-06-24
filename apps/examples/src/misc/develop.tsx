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
				licenseKey="FdUX4R3kJEKr/qE1ALv6+hPngk2Wg1zTxAD5y30dqzAW6ThKp2nSWa6D7H4tCsxtQH5odCaQ2zwQyt5UMPm9BnsiZXhwaXJ5RGF0ZSI6IjIwMjEtMTItMzEiLCJjdXN0b21lciI6IkFsdGFzaWFuIiwidmFsaWRIb3N0cyI6WyJhdGxhc3NpYW4uY29tIiwiYXRsYXNzaWFuLm5ldCJdfQ=="
			/>
		</div>
	)
}
