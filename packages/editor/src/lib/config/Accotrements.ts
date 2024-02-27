import { TLOnMountHandler } from '../TldrawEditor'
import { TLStateNodeConstructor } from '../editor/tools/StateNode'
import { TLEditorComponents } from '../hooks/useEditorComponents'
import { TLAnyShapeUtilConstructor } from './defaultShapes'

/** @public */
export interface Accoutrement {
	id: string
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]
	tools?: readonly TLStateNodeConstructor[]
	onMount?: TLOnMountHandler
	components?: Pick<TLEditorComponents, 'OnTheCanvas' | 'InFrontOfTheCanvas'>
}
