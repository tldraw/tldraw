import { useState } from 'react'
import {
	GenerativeAiTransform,
	TLComponents,
	Tldraw,
	sillyFakeAiDemo,
	useGenerativeAi,
} from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLComponents = {
	TopPanel: MagicAiPrompt,
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}

export function MagicAiPrompt() {
	const [prompt, setPrompt] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	// create a model, and pass in an adapter (the magic part). Maybe this is teach or similar by default?
	const model = useGenerativeAi(sillyFakeAiDemo, {
		// OPTIONAL: make custom changes to the model in/out:
		transforms: [myCustomTransform],
	})

	const handleClick = async () => {
		setIsLoading(true)
		try {
			setPrompt('')
			// call model.generate to make it do the good stuff
			await model.generate(prompt)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div
			style={{
				padding: 10,
				opacity: isLoading ? 0.5 : 1,
				pointerEvents: isLoading ? 'none' : 'auto',
			}}
		>
			<input
				disabled={isLoading}
				type="text"
				placeholder="Prompt"
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
			/>
			<button disabled={isLoading} onClick={handleClick}>
				✨ AI ✨
			</button>
		</div>
	)
}

const myCustomTransform: GenerativeAiTransform = {
	create() {
		return {
			transformChange: (change) => {
				// do weird special overrides for very custom things if needed
				if (change.type === 'updateShape' && change.shape.type === 'text') {
					return {
						...change,
						shape: {
							...change.shape,
							props: { color: 'red' },
						},
					}
				}
				return change
			},
		}
	},
}
