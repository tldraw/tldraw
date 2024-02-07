import { readdirSync } from 'fs'
import { join } from 'path'

describe('every .ts file in the parent folder should have a corresponding .test.ts file', () => {
	const files = new Set(readdirSync(join(__dirname, '..')).filter((file) => file.endsWith('.ts')))
	const testFiles = new Set(readdirSync(__dirname).filter((file) => file.endsWith('.test.ts')))
	for (const fileName of files) {
		const testFileName = fileName.replace(/\.ts$/, '.test.ts')
		test(`Migration file src/migrations/${fileName} has corresponding test file src/migrations/test/${testFileName}`, () => {
			expect(testFiles.has(testFileName)).toBe(true)
		})
	}
})
