import { SceneDefinition, SceneViewProps } from '../../scene-system/types'

function FlatSceneView(_props: SceneViewProps<Record<string, never>>) {
	return null
}

export const flatScene: SceneDefinition<Record<string, never>> = {
	id: 'flat',
	label: 'Flat',
	description: 'Standard tldraw canvas without a 3D projection.',
	createInitialState: () => ({}),
	View: FlatSceneView,
	Controls: null,
}
