import { atom } from 'tldraw'

/** How arrow bindings affect cluster membership. */
export type TLBindingClusterMode = 'ignore' | 'merge' | 'separate'

/** Which spatial graph connects the cluster nodes. */
export type TLClusterEdgeMode = 'none' | 'delaunay' | 'gabriel' | 'rng' | 'mst' | 'knn'

/** Distance between two shapes: gap between bounds, or center-to-center. */
export type TLClusterDistanceMetric = 'gap' | 'center'

export interface ClusterPlaygroundSettings {
	/** Merge shapes whose distance is within eps */
	proximity: boolean
	/** Derive eps from the page's nearest-neighbor distance distribution */
	epsAuto: boolean
	/** Manual eps (page units), used when epsAuto is off */
	eps: number
	/** Scales the automatically derived eps */
	epsMultiplier: number
	/** Distance metric used for proximity, mst, and knn */
	distance: TLClusterDistanceMetric
	/** Merge shapes that are fully contained inside another shape's bounds */
	containment: boolean
	/** How arrow bindings affect clustering */
	bindingMode: TLBindingClusterMode
	/** Compute a finer clustering inside each cluster */
	subclusters: boolean
	/** Subcluster eps = eps / subclusterFactor */
	subclusterFactor: number
	/** Spatial graph connecting cluster centroids */
	edgeMode: TLClusterEdgeMode
	/** k for the knn edge mode */
	knnK: number
	/** Draw arrow-derived edges between clusters */
	showBindingEdges: boolean
	/** Draw the keyword label pill above each cluster */
	showLabels: boolean
}

export const DEFAULT_CLUSTER_SETTINGS: ClusterPlaygroundSettings = {
	proximity: true,
	epsAuto: true,
	eps: 120,
	epsMultiplier: 1,
	distance: 'gap',
	containment: true,
	bindingMode: 'separate',
	subclusters: false,
	subclusterFactor: 3,
	edgeMode: 'gabriel',
	knnK: 2,
	showBindingEdges: true,
	showLabels: true,
}

/** Global settings atom, shared by the overlay util and the control panel. */
export const clusterSettings = atom<ClusterPlaygroundSettings>(
	'cluster playground settings',
	DEFAULT_CLUSTER_SETTINGS
)

export function updateClusterSettings(partial: Partial<ClusterPlaygroundSettings>) {
	clusterSettings.update((prev) => ({ ...prev, ...partial }))
}
