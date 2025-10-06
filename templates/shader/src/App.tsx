import { useMemo } from 'react'
import { DefaultStylePanel, Tldraw, TldrawUiButton, useLocalStorageState } from 'tldraw'
import { FluidConfigPanel } from './fluid/FluidConfigPanel'
import { FluidRenderer } from './fluid/FluidRenderer'
import { MinimalConfigPanel } from './minimal/MinimalConfigPanel'
import { MinimalRenderer } from './minimal/MinimalRenderer'
import { RainbowConfigPanel } from './rainbow/RainbowConfigPanel'
import { RainbowRenderer } from './rainbow/RainbowRenderer'
import './shader.css'
import { ShadowControlPanel } from './shadow/ShadowControlPanel'
import { ShadowRenderer } from './shadow/ShadowRenderer'

function App() {
	const options = [
		{ label: 'Fluid', value: 'fluid' },
		{ label: 'Rainbow', value: 'rainbow' },
		{ label: 'Shadows', value: 'shadows' },
		{ label: 'Minimal', value: 'minimal' },
	]

	const [selected, setSelected] = useLocalStorageState<string>('shader-selected', 'fluid')

	const ConfigComponent = useMemo(() => {
		if (selected === 'fluid') return FluidConfigPanel
		if (selected === 'rainbow') return RainbowConfigPanel
		if (selected === 'shadows') return ShadowControlPanel
		if (selected === 'minimal') return MinimalConfigPanel
	}, [selected])

	const BackgroundComponent = useMemo(() => {
		if (selected === 'fluid') return FluidRenderer
		if (selected === 'rainbow') return RainbowRenderer
		if (selected === 'shadows') return ShadowRenderer
		if (selected === 'minimal') return MinimalRenderer
	}, [selected])

	return (
		<div className="shader-app">
			<Tldraw
				persistenceKey="shader"
				components={{
					Background: BackgroundComponent,
					StylePanel: () => {
						return (
							<div style={{ display: 'flex', flexDirection: 'row' }}>
								{ConfigComponent && <ConfigComponent />}
								<div className="tlui-menu shader-example-toggle">
									{options.map((option) => (
										<TldrawUiButton
											type="menu"
											key={option.value}
											onClick={() => setSelected(option.value)}
											data-isactive={selected === option.value}
										>
											{option.label}
										</TldrawUiButton>
									))}
								</div>
								<DefaultStylePanel />
							</div>
						)
					},
				}}
			/>
		</div>
	)
}

export default App
