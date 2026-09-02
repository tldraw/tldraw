import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { mockUniqueId, setUserPreferences } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { putExcalidrawContent } from './putExcalidrawContent'

let nextNanoId = 0
mockUniqueId(() => `${++nextNanoId}`)

beforeEach(() => {
	nextNanoId = 0
	setUserPreferences({ id: '4', name: '', color: '#7B66DC' })
})

describe('putExcalidrawContent test fixtures', () => {
	const files = readdirSync(join(__dirname, 'excalidraw-test-fixtures')).filter((fileName) =>
		fileName.endsWith('.json')
	)

	test.each(files)('%s', async (fileName) => {
		const filePath = join(__dirname, 'excalidraw-test-fixtures', fileName)
		const fileContent = JSON.parse(await readFile(filePath, 'utf-8'))

		const editor = new TestEditor()

		putExcalidrawContent(editor, fileContent)

		expect(editor.store.serialize()).toMatchSnapshot()
	})
})
