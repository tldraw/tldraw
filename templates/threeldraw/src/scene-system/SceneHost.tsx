import { ComponentType } from 'react'
import { useSceneSystem } from './SceneContext'

export function SceneHost() {
	const { bridge, currentScene, currentSceneState, editor, setCurrentSceneState } = useSceneSystem()
	const View = currentScene.View as ComponentType<any>

	return (
		<View
			bridge={bridge}
			editor={editor}
			state={currentSceneState}
			setState={setCurrentSceneState}
		/>
	)
}
