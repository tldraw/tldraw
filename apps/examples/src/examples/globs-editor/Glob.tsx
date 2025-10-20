import {
	idValidator,
	RecordProps,
	ShapeUtil,
	TLBaseShape,
	TLShapeId,
	VecModel,
	vecModelValidator,
} from 'tldraw'

export interface GlobProps {
	startNode: TLShapeId | null
	endNode: TLShapeId | null
	e0: VecModel
	e1: VecModel
	d: VecModel
	f0: VecModel
	f1: VecModel
}
export type GlobShape = TLBaseShape<'glob', GlobProps>

export class GlobShapeUtil extends ShapeUtil<GlobShape> {
	static override type = 'glob' as const
	static override props: RecordProps<GlobShape> = {
		startNode: idValidator,
		endNode: idValidator,
		e0: vecModelValidator,
		e1: vecModelValidator,
		d: vecModelValidator,
		f0: vecModelValidator,
		f1: vecModelValidator,
	}

	override getDefaultProps(): GlobShape['props'] {
		return {
			startNode: null,
			endNode: null,
			e0: { x: 0, y: 0 },
			e1: { x: 0, y: 0 },
			d: { x: 0, y: 0 },
			f0: { x: 0, y: 0 },
			f1: { x: 0, y: 0 },
		}
	}
}
