import { render } from '@testing-library/react'
import { TldrawEditor, TldrawEditorProps } from '../../TldrawEditor'

// There's a guide at the bottom of this file!

async function renderTldrawEditorComponent(props = {} as TldrawEditorProps) {
	const result = render(<TldrawEditor {...props} />)
	// await result.findByTestId('canvas')
	console.log(result.debug())
	return result
}

describe('<TldrawEditor />', () => {
	it('Renders without crashing', async () => {
		await renderTldrawEditorComponent()
	})
})
