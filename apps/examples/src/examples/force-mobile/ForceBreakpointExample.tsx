import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ForceMobileExample() {
	return <Tldraw persistenceKey="tldraw_example" forceMobile />
}

/* 
This example shows how you can force the editor to use the mobile breakpoint.
Simply pass the `forceMobile` prop to the editor component.
*/
