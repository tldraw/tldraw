import { FluidExample } from './fluid-example/FluidExample'
import { HackableExample } from './hackable-example/HackableExample'
import './shader.css'

function App() {
	return (
		<div className="shader-app">
			<HackableExample />
			<FluidExample />
		</div>
	)
}

export default App
