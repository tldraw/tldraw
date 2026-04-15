import { SceneDefinition } from '../../scene-system/types'
import { CubeSceneView } from './CubeSceneView'

export const cubeScene: SceneDefinition<Record<string, never>> = {
	id: 'cube',
	label: 'Cube',
	description: 'Render the canvas across three faces of an isometric cube.',
	createInitialState: () => ({}),
	View: CubeSceneView,
	Controls: null,
}
