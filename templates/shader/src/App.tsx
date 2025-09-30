import { Tldraw } from 'tldraw'
import { FluidRenderer } from './FluidRenderer'

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				persistenceKey="shader"
				components={{
					Background: FluidRenderer,
				}}
			/>
		</div>
	)
}

export default App
