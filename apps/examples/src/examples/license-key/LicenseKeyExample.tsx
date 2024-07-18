import { Tldraw, debugEnableLicensing } from 'tldraw'
import 'tldraw/tldraw.css'

export default function LicenseKeyExample() {
	// Licensing is disabled for now, let use enable it.
	debugEnableLicensing()
	return (
		<div className="tldraw__editor">
			<Tldraw licenseKey="example" />
		</div>
	)
}
