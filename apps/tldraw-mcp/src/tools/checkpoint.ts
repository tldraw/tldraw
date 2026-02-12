/** checkpoint tools — save and load diagram state. */

import {
	getAllBindings,
	getAllShapes,
	getShapeCount,
	getTitle,
	listCheckpoints,
	loadCheckpoint,
	restoreCheckpoint,
	saveCheckpoint,
} from '../store.js'

export interface SaveCheckpointResult {
	success: boolean
	id: string
	shapeCount: number
}

export function executeSaveCheckpoint(id: string): SaveCheckpointResult {
	saveCheckpoint(id)
	return {
		success: true,
		id,
		shapeCount: getShapeCount(),
	}
}

export interface LoadCheckpointResult {
	success: boolean
	id: string
	shapeCount: number
	title?: string
}

export function executeLoadCheckpoint(id: string): LoadCheckpointResult {
	const checkpoint = loadCheckpoint(id)
	if (!checkpoint) {
		return { success: false, id, shapeCount: 0 }
	}
	restoreCheckpoint(checkpoint)
	return {
		success: true,
		id,
		shapeCount: getShapeCount(),
		title: getTitle(),
	}
}

export interface ListCheckpointsResult {
	checkpoints: string[]
}

export function executeListCheckpoints(): ListCheckpointsResult {
	return { checkpoints: listCheckpoints() }
}

export function getCurrentState() {
	return {
		shapes: getAllShapes(),
		bindings: getAllBindings(),
		title: getTitle(),
	}
}
