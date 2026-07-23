import { Sketch, Sketchbook } from '../../sketch'
import { ClusteringDemo } from './clustering-demo'

// Megan's real clustering pipeline on a live canvas — zoom to merge/split.
const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Clustering/Comment clustering (live)',
	component: ClusteringDemo,
	harness: 'editor',
}
export default sketchbook

export const Live: Sketch<Record<string, never>> = { args: {} }
