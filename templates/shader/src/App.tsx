import { useState } from 'react'
import { FluidExample } from './fluid-example/FluidExample'
import { HackableExample } from './hackable-example/HackableExample'
import './shader.css'

function App() {
	const options = [
		{ label: 'Fluid', value: 'fluid' },
		{ label: 'Hackable', value: 'hackable' },
	]
	const [selected, setSelected] = useState<string>('fluid')

	return (
		<div className="shader-app">
			<div className="shader-example-toggle">
				Examples:
				{options.map((option) => (
					<button
						key={option.value}
						onClick={() => setSelected(option.value)}
						data-isactive={selected === option.value}
					>
						{option.label}
					</button>
				))}
			</div>
			{selected === 'fluid' && <FluidExample />}
			{selected === 'hackable' && <HackableExample />}
		</div>
	)
}

export default App
