import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { TestEditor } from '../../../test/TestEditor'
import { buildFromV1Document } from './buildFromV1Document'

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

describe('buildFromV1Document test fixtures', () => {
	const files = readdirSync(join(__dirname, 'test-fixtures')).filter((fileName) =>
		fileName.endsWith('.tldr')
	)

	test.each(files)('%s', async (fileName) => {
		const filePath = join(__dirname, 'test-fixtures', fileName)
		const fileContent = await readFile(filePath, 'utf-8')
		const { document } = JSON.parse(fileContent)

		const editor = new TestEditor()
		buildFromV1Document(editor, document)

		expect(editor.store.serialize()).toMatchSnapshot()
	})
})
