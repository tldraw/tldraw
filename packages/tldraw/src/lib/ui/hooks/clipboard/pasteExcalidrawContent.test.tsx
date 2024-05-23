import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { TestEditor } from '../../../../test/TestEditor'
import { pasteExcalidrawContent } from './pasteExcalidrawContent'

jest.mock('nanoid', () => {
	let nextNanoId = 0

	const nanoid = () => {
		nextNanoId++
		return `${nextNanoId}`
	}

	return {
		nanoid,
		default: nanoid,
		__reset: () => {
			nextNanoId = 0
		},
	}
})

beforeEach(() => {
	// eslint-disable-next-line
	require('nanoid').__reset()
})

describe('pasteExcalidrawContent test fixtures', () => {
	const files = readdirSync(join(__dirname, 'excalidraw-test-fixtures')).filter((fileName) =>
		fileName.endsWith('.json')
	)

	test.each(files)('%s', async (fileName) => {
		const filePath = join(__dirname, 'excalidraw-test-fixtures', fileName)
		const fileContent = JSON.parse(await readFile(filePath, 'utf-8'))

		const editor = new TestEditor()
		pasteExcalidrawContent(editor, fileContent)

		expect(editor.store.serialize()).toMatchSnapshot()
	})
})
