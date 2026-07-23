import { Sketch, Sketchbook } from '../../sketch'
import { ClusterMotion } from './cluster-motion'

// Megan's cluster decision + a page-space convergence spring — zoom to merge/split with motion.
const sketchbook: Sketchbook<Record<string, never>> = {
	title: 'Clustering/Cluster motion (animated)',
	component: ClusterMotion,
	harness: 'editor',
}
export default sketchbook

export const Motion: Sketch<Record<string, never>> = { args: {} }
