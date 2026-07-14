import { Sketch, Sketchbook } from '../../sketch'
import { RegionCommentsFlow, RegionCommentsFlowProps } from './region-comments'

const sketchbook: Sketchbook<RegionCommentsFlowProps> = {
	title: 'Flows/Region comments',
	component: RegionCommentsFlow,
}
export default sketchbook

/** The default region behaviour: bottom-right pin, reveal on pointer-in-region, move by pin, resize
 *  from corner handles. Drag out a rectangle to create one. */
export const Default: Sketch<RegionCommentsFlowProps> = {
	parameters: { viewport: 'desktop' },
	args: { regionOptions: {} },
}
