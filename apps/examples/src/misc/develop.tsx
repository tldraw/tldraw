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
				licenseKey="Q2CXZkql7RiXfpL3sYNQo5HQ2ZV73xJNpfEvRdNeDR7IS0gHINzUGMsuxWal/JSACjr1BE1/1H4H0RiZ21SiCnsiZXhwaXJ5RGF0ZSI6IjIwMjEtMTItMzEiLCJjdXN0b21lciI6IkFsdGFzaWFuIiwidmFsaWRIb3N0cyI6WyJhdGxhc3NpYW4uY29tIiwiYXRsYXNzaWFuLm5ldCJdLCJmbGFncyI6NSwiZW52IjoiUHJvZHVjdGlvbiJ9"
			/>
		</div>
	)
}
