import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { PoseData } from '../realtime/estimatePose'

/**
 * A one-slot channel that carries the latest estimated pose from the generation
 * side of the app to the three.js figure.
 *
 * The figure is rendered as tldraw's `Background` component, which receives no
 * props, so we can't just pass the pose down. A plain React context that put the
 * pose in its *value* would re-render `ThreeBackground` on every new pose and
 * risk tearing down the scene. Instead the context holds a stable ref whose
 * identity never changes: the render loop reads `poseRef.current` live each
 * frame (the same trick `ThreeBackground` already uses for the tldraw camera),
 * and no React re-render is triggered by a new pose.
 */
const PoseChannelContext = createContext<React.RefObject<PoseData | null> | null>(null)

/**
 * Provides the pose channel. Wrap `<Tldraw>` in this and pass the current pose;
 * the provider keeps the shared ref in sync so the background figure can read it.
 */
export function PoseChannelProvider({
	pose,
	children,
}: {
	pose: PoseData | null
	children: ReactNode
}) {
	// A single ref, stable for the provider's lifetime, is the shared slot.
	const poseRef = useRef<PoseData | null>(pose)
	useEffect(() => {
		poseRef.current = pose
	}, [pose])

	// Memoize so the context value identity is stable (it's the same ref object).
	const value = useMemo(() => poseRef, [])
	return <PoseChannelContext.Provider value={value}>{children}</PoseChannelContext.Provider>
}

/**
 * Read the pose channel from inside the tldraw component tree. Returns a ref
 * (read `.current` in a render loop for the live pose), or null if no provider
 * is mounted — in which case the figure just plays its idle clip.
 */
export function usePoseChannel(): React.RefObject<PoseData | null> | null {
	return useContext(PoseChannelContext)
}
