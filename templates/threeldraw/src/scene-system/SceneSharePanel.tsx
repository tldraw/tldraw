import { ComponentType } from 'react'
import {
	DefaultPeopleMenu,
	TldrawUiRow,
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
} from 'tldraw'
import { useSceneSystem } from './SceneContext'

export function SceneSharePanel() {
	const {
		currentScene,
		currentSceneId,
		currentSceneState,
		scenes,
		setCurrentSceneId,
		setCurrentSceneState,
	} = useSceneSystem()

	const Controls = currentScene.Controls as ComponentType<any> | null | undefined

	return (
		<div className="tlui-share-zone threeldraw-share-zone" draggable={false}>
			<TldrawUiRow className="threeldraw-share-zone__row">
				<TldrawUiSelect
					id="threeldraw-scene-picker"
					value={currentSceneId}
					onValueChange={setCurrentSceneId}
					className="threeldraw-share-zone__select"
					aria-label="3D scene"
				>
					<TldrawUiSelectTrigger>
						<TldrawUiSelectValue>{currentScene.label}</TldrawUiSelectValue>
					</TldrawUiSelectTrigger>
					<TldrawUiSelectContent align="end">
						{scenes.map((scene) => (
							<TldrawUiSelectItem key={scene.id} value={scene.id} label={scene.label} />
						))}
					</TldrawUiSelectContent>
				</TldrawUiSelect>
				{Controls ? <Controls state={currentSceneState} setState={setCurrentSceneState} /> : null}
				<DefaultPeopleMenu />
			</TldrawUiRow>
		</div>
	)
}
