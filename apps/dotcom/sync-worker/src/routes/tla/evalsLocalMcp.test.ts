import { afterEach, describe, expect, it } from 'vitest'
import { testRoutes } from '../../testRoutes'
import { BOARD_SEARCH_PAGE_SIZE } from './boardTools'
import { getEvalsFixtureScreenshotPlan, resetEvalsFixtureSessionsForTests } from './evalsLocalMcp'
import { makeSnapshot } from './screenshotTestHelpers'

const localEnv = { IS_LOCAL: 'true', TLDRAW_ENV: 'development' } as never

afterEach(resetEvalsFixtureSessionsForTests)

function request(path: string, method: string, body?: unknown) {
	return new Request(`http://localhost${path}`, {
		method,
		...(body === undefined
			? null
			: { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
	})
}

describe('local eval fixture MCP', () => {
	it('is unavailable outside local development', async () => {
		const response = await testRoutes.fetch(request('/app/__test__/evals/plan', 'POST', {}), {
			IS_LOCAL: 'false',
			TLDRAW_ENV: 'production',
		} as never)
		expect(response.status).toBe(404)
	})

	it('plans fixture screenshots with the real clustering logic', () => {
		const snapshot = makeSnapshot([{ id: 'page:one', index: 'a1', shapes: 1 }])
		const plan = getEvalsFixtureScreenshotPlan(snapshot, {
			'shape:page:one-0': { minX: 0, minY: 0, maxX: 80, maxY: 80, text: 'Q4' },
		})

		expect(plan).toHaveLength(1)
		expect(plan[0]).toMatchObject({
			pageId: 'page:one',
			shapeIds: ['shape:page:one-0'],
		})
		expect(plan[0].clusterIds).toHaveLength(1)
	})

	it('serves uploaded boards through the real board tools', async () => {
		const snapshot = makeSnapshot([{ id: 'page:one', index: 'a1', name: 'One', shapes: 1 }])
		const boardResponse = await testRoutes.fetch(
			request('/app/__test__/evals/sessions/session/boards/roadmap', 'PUT', {
				snapshot,
				measurements: {
					'shape:page:one-0': { minX: 0, minY: 0, maxX: 80, maxY: 80, text: 'Q4' },
				},
				shots: {},
			}),
			localEnv
		)
		expect(boardResponse.status).toBe(201)

		const mcpResponse = await testRoutes.fetch(
			request('/app/__test__/evals/sessions/session/mcp', 'POST', {
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { name: 'get_board_info', arguments: { boardId: 'roadmap' } },
			}),
			localEnv
		)
		expect(mcpResponse.status).toBe(200)
		const rpc = (await mcpResponse.json()) as any
		expect(JSON.parse(rpc.result.content[0].text)).toMatchObject({
			name: 'My Board',
			pages: [{ id: 'page:one', name: 'One', hasContent: true }],
		})
	})

	it('serves search_boards over the session’s fixture boards', async () => {
		for (const [boardId, boardName] of [
			['roadmap', 'Q4 roadmap'],
			['sketches', 'Loose sketches'],
		]) {
			const stored = await testRoutes.fetch(
				request(`/app/__test__/evals/sessions/search/boards/${boardId}`, 'PUT', {
					snapshot: makeSnapshot(
						[{ id: 'page:one', index: 'a1', name: 'One', shapes: 1 }],
						boardName
					),
					measurements: {},
					shots: {},
				}),
				localEnv
			)
			expect(stored.status).toBe(201)
		}

		const mcpResponse = await testRoutes.fetch(
			request('/app/__test__/evals/sessions/search/mcp', 'POST', {
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { name: 'search_boards', arguments: { query: 'roadmap' } },
			}),
			localEnv
		)
		expect(mcpResponse.status).toBe(200)
		const rpc = (await mcpResponse.json()) as any
		expect(JSON.parse(rpc.result.content[0].text)).toMatchObject({
			boardCount: 1,
			// A plausible timestamp, not the 1970 a bare index would produce: a model reasoning about
			// how new a board is in an eval reads this field.
			boards: [
				{
					boardId: 'roadmap',
					name: 'Q4 roadmap',
					source: 'owned',
					createdAt: '2026-01-05T09:00:00.000Z',
				},
			],
		})
	})

	// Fixtures have no `file` row and so no creation times; insertion order stands in for one, so the
	// ordering and paging the deployed tool applies are both still exercised.
	it('pages through fixture boards with a cursor', async () => {
		for (let index = 0; index < BOARD_SEARCH_PAGE_SIZE + 1; index++) {
			await testRoutes.fetch(
				request(`/app/__test__/evals/sessions/paged/boards/board-${index}`, 'PUT', {
					snapshot: makeSnapshot([{ id: 'page:one', index: 'a1', shapes: 1 }], `Board ${index}`),
					measurements: {},
					shots: {},
				}),
				localEnv
			)
		}

		async function searchPage(args: object) {
			const response = await testRoutes.fetch(
				request('/app/__test__/evals/sessions/paged/mcp', 'POST', {
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: { name: 'search_boards', arguments: args },
				}),
				localEnv
			)
			return JSON.parse(((await response.json()) as any).result.content[0].text)
		}

		const first = await searchPage({})
		expect(first.boardCount).toBe(BOARD_SEARCH_PAGE_SIZE)
		expect(first.nextCursor).toEqual(expect.any(String))

		const second = await searchPage({ cursor: first.nextCursor })
		expect(second.boardCount).toBe(1)
		expect(second.nextCursor).toBeUndefined()

		// The whole point of a cursor: no board appears on two pages, and none is skipped.
		const ids = [...first.boards, ...second.boards].map(
			(board: { boardId: string }) => board.boardId
		)
		expect(new Set(ids).size).toBe(BOARD_SEARCH_PAGE_SIZE + 1)
	})
})
