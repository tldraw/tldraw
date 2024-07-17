import { render } from '@testing-library/react'
import { TldrawEditor, TldrawEditorProps } from '../../TldrawEditor'

async function renderTldrawEditorComponent(props = {} as TldrawEditorProps) {
	const result = render(<TldrawEditor {...props} />)
	await result.findByTestId('canvas')
	return result
}

describe('<TldrawEditor />', () => {
	it('Renders without crashing', async () => {
		await renderTldrawEditorComponent()
	})
})
