import { DefaultToolbar, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLComponents = {
	Toolbar: () => <DefaultToolbar orientation="vertical" />,
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
