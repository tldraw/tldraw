import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpClient, describeError } from './mcp-client.js'
import { loadSuite, parseBoardUrl } from './suite-loader.js'

/**
 * Fixture authoring helper.
 *
 * Pulls every page of a board to disk as a PNG. `locate` tasks are graded against
 * a normalized box, and you cannot write that box without looking at the exact
 * image the agent will see — so this dumps those images and prints the arithmetic
 * for turning pixel coordinates into the normalized ones the suite file wants.
 *
 *   yarn fixtures --board <url-or-slug>
 *   yarn fixtures --suite suites/default.json
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(HERE, '..')
const DEFAULT_ENDPOINT = 'https://www.tldraw.com/api/app/mcp'

async function main() {
	const argv = process.argv.slice(2)
	const flags = new Map<string, string>()
	for (let i = 0; i < argv.length; i++) {
		if (!argv[i].startsWith('--')) continue
		const eq = argv[i].indexOf('=')
		if (eq !== -1) flags.set(argv[i].slice(2, eq), argv[i].slice(eq + 1))
		else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags.set(argv[i].slice(2), argv[++i])
	}

	const outDir = flags.get('out') ?? join(PACKAGE_ROOT, 'fixtures')
	const theme = (flags.get('theme') ?? 'light') as 'light' | 'dark'
	const mcp = new McpClient({
		endpoint: flags.get('endpoint') ?? DEFAULT_ENDPOINT,
		cacheDir: join(PACKAGE_ROOT, '.cache'),
		log: (message) => console.log(message),
	})

	const boardIds: string[] = []
	const explicit = flags.get('board')
	if (explicit) boardIds.push(parseBoardUrl(explicit).boardId)

	// With no arguments at all, dump the default suite — that is the common case
	// when you are about to author `locate` boxes for the CSV you just wrote.
	const suitePath =
		flags.get('suite') ?? (explicit ? undefined : join(PACKAGE_ROOT, 'suites/default.csv'))
	if (suitePath) {
		const suite = await loadSuite(suitePath)
		for (const board of Object.values(suite.boards)) boardIds.push(board.boardId)
	}

	if (boardIds.length === 0) {
		throw new Error('Pass --board <url-or-slug> or --suite <path>')
	}

	await mkdir(outDir, { recursive: true })

	for (const boardId of boardIds) {
		console.log(`\n${boardId}`)
		const infoResult = await mcp.callTool('get_board_info', { boardId })
		const infoText = infoResult.content.map((block) => block.text ?? '').join('')
		if (infoResult.isError) {
			console.log(`  ✗ ${infoText}`)
			continue
		}

		const info = JSON.parse(infoText) as {
			name: string
			pageCount: number
			pages: { index: number; name: string; hasContent: boolean }[]
		}
		console.log(`  "${info.name}" — ${info.pageCount} page(s)`)

		for (const page of info.pages) {
			if (!page.hasContent) {
				console.log(`  page ${page.index} "${page.name}": empty, skipped`)
				continue
			}
			const shot = await mcp.callTool('get_shared_board_screenshot', {
				boardId,
				page: page.index,
				theme,
			})
			if (shot.isError) {
				console.log(`  page ${page.index}: ✗ ${shot.content.map((b) => b.text ?? '').join('')}`)
				continue
			}
			const image = shot.content.find((block) => block.type === 'image' && block.data)
			if (!image?.data) {
				console.log(`  page ${page.index}: ✗ no image in result`)
				continue
			}
			const file = join(outDir, `${boardId}-p${page.index}-${theme}.png`)
			await writeFile(file, Buffer.from(image.data, 'base64'))
			console.log(`  page ${page.index} "${page.name}": ${file}`)
		}
	}

	console.log(
		[
			'',
			'To author a `locate` task, open the PNG for the target page and read the',
			'bounding box of the thing in pixels, then normalize against the 1200x630',
			'screenshot: x0/1200, y0/630, x1/1200, y1/630. Ground truth is the box the',
			'agent should point *inside*, so keep it tight around the target.',
		].join('\n')
	)
}

main().catch((error) => {
	console.error(`\nFixture dump failed: ${describeError(error)}`)
	process.exitCode = 1
})
