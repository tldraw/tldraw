import { ISimpleShape } from '../../shared/format/SimpleShape'
import { AgentIcon } from './icons/AgentIcon'

export function SelectionPreview({ selectedShapes }: { selectedShapes: ISimpleShape[] }) {
	if (selectedShapes.length === 0) {
		return null
	}

	return (
		<div className="context-item-preview-container">
			<div className="context-item-preview">
				<AgentIcon type="cursor" /> {selectedShapes.length}{' '}
				{selectedShapes.length === 1 ? 'shape' : 'shapes'}
			</div>
		</div>
	)
}
