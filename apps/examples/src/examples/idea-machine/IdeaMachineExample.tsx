import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { IdeaMachineModal } from './IdeaMachineModal'
import './idea-machine.css'

const components: TLComponents = {
	InFrontOfTheCanvas: IdeaMachineModal,
}

export default function IdeaMachineExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="idea-machine" components={components} />
		</div>
	)
}
