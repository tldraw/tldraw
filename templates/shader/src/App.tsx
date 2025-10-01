import { DefaultStylePanel, Tldraw } from 'tldraw'
import { ConfigPanel } from './ConfigPanel'
import { FluidRenderer } from './FluidRenderer'

function App() {
	return (
		<div className="shader-app">
			<Tldraw
				persistenceKey="shader"
				components={{
					Background: FluidRenderer,
					StylePanel: () => {
						return (
							<div style={{ display: 'flex', flexDirection: 'row' }}>
								<ConfigPanel />
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
