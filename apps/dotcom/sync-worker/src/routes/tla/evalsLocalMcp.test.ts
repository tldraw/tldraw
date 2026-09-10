import { afterEach, describe, expect, it } from 'vitest'
import { testRoutes } from '../../testRoutes'
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
})
