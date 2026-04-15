import { useCallback } from 'react'
import { SceneControlsProps } from '../../scene-system/types'
import { SphereSceneState } from './sphereConstants'

const DEG = Math.PI / 180

export function SphereControls({ state, setState }: SceneControlsProps<SphereSceneState>) {
	const azDeg = Math.round((state as SphereSceneState).azimuth / DEG)
	const elDeg = Math.round((state as SphereSceneState).elevation / DEG)

	const setAzimuth = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const deg = Number(e.target.value)
			setState((prev: unknown) => ({
				...(prev as SphereSceneState),
				azimuth: deg * DEG,
			}))
		},
		[setState]
	)

	const setElevation = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const deg = Number(e.target.value)
			setState((prev: unknown) => ({
				...(prev as SphereSceneState),
				elevation: deg * DEG,
			}))
		},
		[setState]
	)

	return (
		<div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
			<label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
				Az
				<input
					type="range"
					min={-180}
					max={180}
					value={azDeg}
					onChange={setAzimuth}
					style={{ width: 80 }}
				/>
			</label>
			<label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
				El
				<input
					type="range"
					min={-90}
					max={90}
					value={elDeg}
					onChange={setElevation}
					style={{ width: 80 }}
				/>
			</label>
		</div>
	)
}
