import { Tldraw } from '@tldraw/tldraw'
import { memo } from 'react'

export default function CustomUiComponentsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="custom-ui-components-example" uiComponents={{ Toolbar: MyToolbar }} />
		</div>
	)
}

const MyToolbar = memo(function Toolbar() {
	return <div>My Custom Toolbar</div>
})
