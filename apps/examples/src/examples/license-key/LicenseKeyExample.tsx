import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function LicenseKeyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw licenseKey="example" />
		</div>
	)
}
