import { useEffect } from 'react'
import { Tldraw, debugEnableLicensing } from 'tldraw'
import 'tldraw/tldraw.css'

export default function LicenseKeyExample() {
	// [1]
	useEffect(() => debugEnableLicensing(), [])

	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw licenseKey="example" />
		</div>
	)
}

/* 
This is an example of how to use a license key in tldraw.

[1] 
Licensing is still disabled in this version, but you can enable it using this helper function.

[2]
Let's pass in the license key to the `Tldraw` component. 

*/
