import { ISimpleShape } from '../format/SimpleShape'

export interface UserActionEntry {
	type: 'create' | 'update' | 'delete'
	initialShape: ISimpleShape | null
	finalShape: ISimpleShape | null
}

export interface UserActionHistory {
	shapeId: string
	changes: UserActionEntry[]
}
