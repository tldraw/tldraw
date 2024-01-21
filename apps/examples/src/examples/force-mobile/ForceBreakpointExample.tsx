import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ForceMobileExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" forceMobile />
		</div>
	)
}

/* 
This example shows how you can force the editor to use the mobile breakpoint.
Simply pass the `forceMobile` prop to the editor component.
*/
