import { useMemo } from 'react'
import { DefaultStylePanel, Tldraw, TldrawUiButton, useLocalStorageState } from 'tldraw'
import { FluidConfigPanel } from './fluid-example/FluidConfigPanel'
import { FluidRenderer } from './fluid-example/FluidRenderer'
import { ParticlePhysicsConfigPanel } from './particle-example/ParticlePhysicsConfigPanel'
import { ParticlePhysicsRenderer } from './particle-example/ParticlePhysicsExample'
import { RainbowConfigPanel } from './rainbow-example/RainbowConfigPanel'
import { RainbowRenderer } from './rainbow-example/RainbowExample'
import './shader.css'
import { ShadowCastingConfigPanel } from './shadowcasting-example/ShadowCastingConfigPanel'
import { ShadowCastingRenderer } from './shadowcasting-example/ShadowCastingExample'

function App() {
	const options = [
		{ label: 'Fluid', value: 'fluid' },
		{ label: 'Rainbow', value: 'rainbow' },
		{ label: 'Shadows', value: 'shadows' },
		{ label: 'Particles', value: 'particles' },
	]

	const [selected, setSelected] = useLocalStorageState<string>('shader-selected', 'fluid')

	const ConfigComponent = useMemo(() => {
		if (selected === 'fluid') return FluidConfigPanel
		if (selected === 'rainbow') return RainbowConfigPanel
		if (selected === 'shadows') return ShadowCastingConfigPanel
		if (selected === 'particles') return ParticlePhysicsConfigPanel
	}, [selected])

	const BackgroundComponent = useMemo(() => {
		if (selected === 'fluid') return FluidRenderer
		if (selected === 'rainbow') return RainbowRenderer
		if (selected === 'shadows') return ShadowCastingRenderer
		if (selected === 'particles') return ParticlePhysicsRenderer
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
