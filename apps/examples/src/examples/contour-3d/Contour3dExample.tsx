import { useCallback, useState } from 'react'
import {
	DefaultStylePanel,
	StylePanelSection,
	TLComponents,
	TLUiStylePanelProps,
	Tldraw,
	TldrawUiSlider,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './contour-3d.css'
import { Contour3dContext, Contour3dOverlay, useContour3d } from './Contour3dRenderer'

const DEFAULT_ELEVATION = 200
const DEFAULT_TILT_DEG = 50

function Contour3dStylePanel(props: TLUiStylePanelProps) {
	const { isSculpting, setIsSculpting, elevation, setElevation, tiltDeg, setTiltDeg } =
		useContour3d()

	const handleElevationChange = useCallback(
		(value: number) => {
			setElevation(value * 10)
		},
		[setElevation]
	)

	const handleTiltChange = useCallback(
		(value: number) => {
			setTiltDeg(value + 10)
		},
		[setTiltDeg]
	)

	return (
		<>
			<DefaultStylePanel {...props} />
			<div className="tlui-style-panel__wrapper contour-3d-panel">
				<div className="tlui-style-panel">
					{isSculpting ? (
						<StylePanelSection>
							<div className="contour-3d-panel__label">
								<span>Elevation</span>
								<span>{elevation}px</span>
							</div>
							<TldrawUiSlider
								steps={50}
								value={Math.round(elevation / 10)}
								label={`${elevation}px`}
								title="Elevation"
								onValueChange={handleElevationChange}
							/>
							<div className="contour-3d-panel__label">
								<span>Tilt</span>
								<span>{tiltDeg}°</span>
							</div>
							<TldrawUiSlider
								steps={70}
								value={tiltDeg - 10}
								label={`${tiltDeg}°`}
								title="Tilt"
								onValueChange={handleTiltChange}
							/>
							<button
								className="contour-3d-panel__text-button"
								onClick={() => setIsSculpting(false)}
							>
								Exit
							</button>
						</StylePanelSection>
					) : (
						<StylePanelSection>
							<button
								className="contour-3d-panel__text-button"
								onClick={() => setIsSculpting(true)}
							>
								Sculpt 3D
							</button>
						</StylePanelSection>
					)}
				</div>
			</div>
		</>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: Contour3dOverlay,
	StylePanel: Contour3dStylePanel,
}

export default function Contour3dExample() {
	const [isSculpting, setIsSculpting] = useState(false)
	const [elevation, setElevation] = useState(DEFAULT_ELEVATION)
	const [tiltDeg, setTiltDeg] = useState(DEFAULT_TILT_DEG)

	return (
		<div className="tldraw__editor">
			<Contour3dContext.Provider
				value={{ isSculpting, setIsSculpting, elevation, setElevation, tiltDeg, setTiltDeg }}
			>
				<Tldraw persistenceKey="contour-3d" components={components} />
			</Contour3dContext.Provider>
		</div>
	)
}
