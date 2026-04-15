import { SceneDefinition } from '../../scene-system/types'
import { DEFAULT_SPHERE_STATE, SphereSceneState } from '../sphere-shared/sphereConstants'
import { SphereControls } from '../sphere-shared/SphereControls'
import { SphereDomeView } from './SphereDomeView'

export const sphereDomeScene: SceneDefinition<SphereSceneState> = {
	id: 'sphere-dome',
	label: 'Sphere (dome)',
	description: 'Map the canvas onto a hemisphere dome.',
	createInitialState: () => ({ ...DEFAULT_SPHERE_STATE }),
	View: SphereDomeView,
	Controls: SphereControls,
}
