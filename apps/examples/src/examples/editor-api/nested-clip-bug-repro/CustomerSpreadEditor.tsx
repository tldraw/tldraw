import { useMemo } from 'react'
import { TLComponents, Tldraw } from 'tldraw'
import { BROKEN_LEFT_IMAGE_ID, setupCustomerSpreadScene } from './customerSpreadScene'
import { LegacyClipPathLayer } from './LegacyClipPathLayer'
import { RoleFrameShapeUtil } from './RoleFrameShapeUtil'

export function CustomerSpreadEditor({ simulateLegacy }: { simulateLegacy: boolean }) {
	const components = useMemo((): TLComponents | undefined => {
		if (!simulateLegacy) return undefined
		return {
			InFrontOfTheCanvas: () => <LegacyClipPathLayer shapeId={BROKEN_LEFT_IMAGE_ID} />,
		}
	}, [simulateLegacy])

	return (
		<Tldraw
			shapeUtils={[RoleFrameShapeUtil]}
			components={components}
			onMount={setupCustomerSpreadScene}
		/>
	)
}
