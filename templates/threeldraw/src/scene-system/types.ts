import { ComponentType, Dispatch, SetStateAction } from 'react'
import { Editor } from 'tldraw'

export interface SceneScreenPoint {
	x: number
	y: number
	z?: number
}

export interface SceneBridge {
	editor: Editor | null
	dispatchPointer(event: PointerEvent, point: SceneScreenPoint): void
	dispatchWheel(event: WheelEvent, point: SceneScreenPoint): void
}

export interface SceneViewProps<TState = unknown> {
	editor: Editor | null
	state: TState
	setState: Dispatch<SetStateAction<TState>>
	bridge: SceneBridge
}

export interface SceneControlsProps<TState = unknown> {
	state: TState
	setState: Dispatch<SetStateAction<TState>>
}

export interface SceneDefinition<TState = unknown> {
	id: string
	label: string
	description?: string
	createInitialState(): TState
	View: ComponentType<SceneViewProps<TState>>
	Controls?: ComponentType<SceneControlsProps<TState>> | null
}

export type AnySceneDefinition = SceneDefinition<any>
