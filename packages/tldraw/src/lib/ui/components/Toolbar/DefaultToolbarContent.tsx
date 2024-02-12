import { useReadonly } from '../../hooks/useReadonly'
import { useTools } from '../../hooks/useTools'
import { TldrawUiMenuItem } from '../menus/TldrawUiMenuItem'

/** @public */
export function DefaultToolbarContent() {
	const tools = useTools()
	const isReadonly = useReadonly()

	if (isReadonly) {
		return (
			<>
				<TldrawUiMenuItem {...tools['select']} />
				<TldrawUiMenuItem {...tools['hand']} />
				<TldrawUiMenuItem {...tools['laser']} />
			</>
		)
	}

	return (
		<>
			<TldrawUiMenuItem {...tools['select']} />
			<TldrawUiMenuItem {...tools['hand']} />
			<TldrawUiMenuItem {...tools['draw']} />
			<TldrawUiMenuItem {...tools['eraser']} />
			<TldrawUiMenuItem {...tools['arrow']} />
			<TldrawUiMenuItem {...tools['text']} />
			<TldrawUiMenuItem {...tools['note']} />
			<TldrawUiMenuItem {...tools['asset']} />
			<TldrawUiMenuItem {...tools['rectangle']} />
			<TldrawUiMenuItem {...tools['ellipse']} />
			<TldrawUiMenuItem {...tools['diamond']} />
			<TldrawUiMenuItem {...tools['triangle']} />
			<TldrawUiMenuItem {...tools['trapezoid']} />
			<TldrawUiMenuItem {...tools['rhombus']} />
			<TldrawUiMenuItem {...tools['hexagon']} />
			<TldrawUiMenuItem {...tools['cloud']} />
			<TldrawUiMenuItem {...tools['star']} />
			<TldrawUiMenuItem {...tools['oval']} />
			<TldrawUiMenuItem {...tools['x-box']} />
			<TldrawUiMenuItem {...tools['check-box']} />
			<TldrawUiMenuItem {...tools['arrow-left']} />
			<TldrawUiMenuItem {...tools['arrow-up']} />
			<TldrawUiMenuItem {...tools['arrow-down']} />
			<TldrawUiMenuItem {...tools['arrow-right']} />
			<TldrawUiMenuItem {...tools['line']} />
			<TldrawUiMenuItem {...tools['highlight']} />
			<TldrawUiMenuItem {...tools['frame']} />
			<TldrawUiMenuItem {...tools['laser']} />
		</>
	)
}
