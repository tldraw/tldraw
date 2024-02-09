import { existsSync, readFileSync } from 'fs'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { tldrawMigrations } from '../tldrawMigrations'

test('tldrawMigrations', () => {
	// It is EXTREMELY important that the order of the migrations is never changed after they have been run in production.
	// You can add to the end, but never remove or change the order of the migrations.
	expect(tldrawMigrations).toMatchInlineSnapshot(`
{
  "id": "com.tldraw",
  "migrations": [
    {
      "id": "com.tldraw/000_InitialMigration",
      "scope": "store",
      "up": [Function],
    },
  ],
}
`)
})

describe('each migration should be in a separate file', () => {
	const migrations = tldrawMigrations.migrations
	for (const migration of migrations) {
		const name = migration.id.split('/')[1]
		test(`src/migrations/${name}.ts should exist`, () => {
			expect(existsSync(join(__dirname, '..', name + '.ts'))).toBeTruthy()
		})
	}
})

const findRootDir = () => {
	const isRootDir = (dir: string) => {
		return (
			existsSync(join(dir, 'package.json')) &&
			existsSync(join(dir, '.git')) &&
			existsSync(join(dir, 'packages'))
		)
	}
	let dir = __dirname
	while (dir && dirname(dir) !== dir && !isRootDir(dir)) {
		dir = dirname(dir)
	}
	if (!isRootDir(dir)) {
		throw new Error('Could not find root dir')
	}
	return dir
}

test('the CustomConfigExample.tsx file should be up-to-date', () => {
	const numMigrations = tldrawMigrations.migrations.length

	// use glob to find the file to allow for some flexibility in files moving around
	const matches = glob.sync('**/CustomConfigExample.tsx', {
		cwd: findRootDir(),
		absolute: true,
		ignore: ['node_modules/**/*', '.*/**/*'],
	})

	// If this line is failing, check whether the CustomConfigExample.tsx file was renamed
	expect(matches.length).toBeGreaterThan(0)

	// If this line is failing, make sure there's only one CustomConfigExample.tsx file in the repo
	expect(matches.length).toBe(1)

	const filePath = matches[0]

	expect(filePath).toBeTruthy()

	const contents = readFileSync(filePath, 'utf-8')
	const match = contents.match(
		/You need to hard-code the number of tldraw migrations at the time of setup\.\s+(\d+),?\s+/
	)

	// If this line is failing, check whether the tldrawMigrations.migrations.slice(...) call
	// in the CustomConfigExample.tsx file was changed.
	expect(match?.[1]).toBeTruthy()

	const num = parseInt(match?.[1] ?? '0')

	// If this line is failing you need to bump the hard-coded number of
	// tldraw migrations in the slice command in CustomConfigExample.tsx
	expect(num).toBe(numMigrations)
})
