import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { detectInstalledVersion } from './detectVersion'

let tmp: string

beforeAll(() => {
	tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tldraw-migrate-test-'))
})
afterAll(() => {
	fs.rmSync(tmp, { recursive: true, force: true })
})

function withPkg(json: object): string {
	const dir = fs.mkdtempSync(path.join(tmp, 'pkg-'))
	fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(json))
	return dir
}

describe('detectInstalledVersion', () => {
	it('returns null when there is no package.json', () => {
		const dir = fs.mkdtempSync(path.join(tmp, 'empty-'))
		expect(detectInstalledVersion({ cwd: dir })).toBeNull()
	})

	it('returns null when no tldraw package is listed', () => {
		const dir = withPkg({ dependencies: { react: '^18.0.0' } })
		expect(detectInstalledVersion({ cwd: dir })).toBeNull()
	})

	it('reads from dependencies', () => {
		const dir = withPkg({ dependencies: { tldraw: '^4.5.10' } })
		expect(detectInstalledVersion({ cwd: dir })).toEqual({
			version: '4.5.10',
			major: '4',
			source: 'tldraw',
			rawRange: '^4.5.10',
		})
	})

	it('reads from devDependencies and peerDependencies', () => {
		const dir = withPkg({ devDependencies: { '@tldraw/editor': '~4.6.0' } })
		expect(detectInstalledVersion({ cwd: dir })).toMatchObject({
			version: '4.6.0',
			major: '4',
			source: '@tldraw/editor',
		})
	})

	it('picks the highest version when multiple tldraw packages disagree', () => {
		const dir = withPkg({
			dependencies: { tldraw: '4.5.0', '@tldraw/editor': '4.6.2' },
		})
		expect(detectInstalledVersion({ cwd: dir })).toMatchObject({
			version: '4.6.2',
			source: '@tldraw/editor',
		})
	})

	it('rejects unparseable ranges', () => {
		const dir = withPkg({ dependencies: { tldraw: 'next' } })
		expect(detectInstalledVersion({ cwd: dir })).toBeNull()
	})
})
