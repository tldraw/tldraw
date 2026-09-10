import { DefaultStylePanel, Tldraw, TldrawUiButton, useLocalStorageState } from 'tldraw'
import { FluidConfigPanel } from './fluid/FluidConfigPanel'
import { FluidRenderer } from './fluid/FluidRenderer'
import { MinimalConfigPanel } from './minimal/MinimalConfigPanel'
import { MinimalRenderer } from './minimal/MinimalRenderer'
import { RainbowConfigPanel } from './rainbow/RainbowConfigPanel'
import { RainbowRenderer } from './rainbow/RainbowRenderer'
import { ShadowControlPanel } from './shadow/ShadowControlPanel'
import { ShadowRenderer } from './shadow/ShadowRenderer'

const EXAMPLES = [
	{ label: 'Fluid', value: 'fluid', ConfigPanel: FluidConfigPanel, Renderer: FluidRenderer },
	{
		label: 'Rainbow',
		value: 'rainbow',
		ConfigPanel: RainbowConfigPanel,
		Renderer: RainbowRenderer,
	},
	{ label: 'Shadows', value: 'shadows', ConfigPanel: ShadowControlPanel, Renderer: ShadowRenderer },
	{
		label: 'Minimal',
		value: 'minimal',
		ConfigPanel: MinimalConfigPanel,
		Renderer: MinimalRenderer,
	},
]

function App() {
	const [selected, setSelected] = useLocalStorageState<string>('shader-selected', 'fluid')
	const example = EXAMPLES.find((e) => e.value === selected)
	const ConfigComponent = example?.ConfigPanel

	return (
		<div className="shader-app">
			<Tldraw
				persistenceKey="shader"
				components={{
					Background: example?.Renderer,
					StylePanel: () => {
						return (
							<div style={{ display: 'flex', flexDirection: 'row' }}>
								{ConfigComponent && <ConfigComponent />}
								<div className="tlui-menu shader-app__example-menu">
									{EXAMPLES.map((option) => (
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
