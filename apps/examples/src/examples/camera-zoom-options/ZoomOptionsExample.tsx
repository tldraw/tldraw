import { useState } from 'react'
import { DefaultHelperButtons, DefaultHelperButtonsContent, Tldraw } from 'tldraw'
import { SelectButtons } from '../../components/SelectButtons'

export default function ZoomOptionsExample() {
	const [minZoom, setMinZoom] = useState(0.1)
	const [maxZoom, setMaxZoom] = useState(8)
	const [sensitivity, setSensitivity] = useState(0.01)
	return (
		<div className="tldraw__editor">
			<Tldraw
				camera={{
					zoom: {
						min: minZoom,
						max: maxZoom,
						stops: [minZoom, (minZoom + maxZoom) / 2, maxZoom],
						wheelSensitivity: sensitivity,
					},
				}}
				components={{
					HelperButtons: () => (
						<DefaultHelperButtons>
							<SelectButtons
								label="Minimum zoom"
								value={minZoom}
								onChange={setMinZoom}
								items={[
									{ value: 0.01, label: '1%' },
									{ value: 0.1, label: '10%' },
									{ value: 1, label: '100%' },
								]}
							/>
							<SelectButtons
								label="Maximum zoom"
								value={maxZoom}
								onChange={setMaxZoom}
								items={[
									{ value: 1, label: '100%' },
									{ value: 8, label: '800%' },
									{ value: 80, label: '8000%' },
								]}
							/>
							<SelectButtons
								label="Wheel sensitivity"
								value={sensitivity}
								onChange={setSensitivity}
								items={[
									{ value: 0.0025, label: 'Low' },
									{ value: 0.01, label: 'Normal' },
									{ value: 0.04, label: 'High' },
								]}
							/>
							<DefaultHelperButtonsContent />
						</DefaultHelperButtons>
					),
				}}
			/>
		</div>
	)
}
