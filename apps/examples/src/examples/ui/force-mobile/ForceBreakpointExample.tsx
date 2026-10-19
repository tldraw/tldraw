import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ForceMobileExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="force-mobile-example" forceMobile />
		</div>
	)
}

/*
The `forceMobile` prop pins the UI to the mobile breakpoint regardless of the
container's width. Useful for previewing the mobile layout on desktop, or when
the editor is embedded in a narrow panel where the desktop layout wouldn't fit.
*/
