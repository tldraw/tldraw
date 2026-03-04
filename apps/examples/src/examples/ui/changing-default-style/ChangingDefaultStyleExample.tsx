import { DefaultSizeStyle, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

DefaultSizeStyle.setDefaultValue('s')

export default function ChangingDefaultStyleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" />
		</div>
	)
}
