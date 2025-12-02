import { Editor, PageRecordType } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyApp } from '../../FairyApp'
import { FairyAppFollowingManager } from '../FairyAppFollowingManager'
import { createTestEditor, createTestFairyApp } from './fairy-app-managers-test-shared'

describe('FairyAppFollowingManager', () => {
	let editor: Editor
	let fairyApp: FairyApp
	let manager: FairyAppFollowingManager

	beforeEach(() => {
		editor = createTestEditor()
		fairyApp = createTestFairyApp(editor)
		manager = fairyApp.following
	})

	afterEach(() => {
		editor.dispose()
		fairyApp.dispose()
	})

	describe('getFollowingFairyId', () => {
		it('should return null initially', () => {
			expect(manager.getFollowingFairyId()).toBeNull()
		})
	})

	describe('isFollowingFairy', () => {
		it('should return false when not following any fairy', () => {
			expect(manager.isFollowingFairy('test-fairy-id')).toBe(false)
		})
	})

	describe('isFollowing', () => {
		it('should return false when not following any fairy', () => {
			expect(manager.isFollowing()).toBe(false)
		})

		it('should return true when following a fairy', () => {
			// Create a fairy agent
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const fairyId = agents[0]!.id

			// Mock the agent's getEntity to return valid entity
			vi.spyOn(agents[0]!, 'getEntity').mockReturnValue({
				position: { x: 0, y: 0 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			manager.startFollowing(fairyId)
			expect(manager.isFollowing()).toBe(true)
		})
	})

	describe('startFollowing', () => {
		it('should start following a fairy', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const fairyId = agents[0]!.id

			// Mock the agent's getEntity to return valid entity
			vi.spyOn(agents[0]!, 'getEntity').mockReturnValue({
				position: { x: 0, y: 0 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			manager.startFollowing(fairyId)

			expect(manager.getFollowingFairyId()).toBe(fairyId)
			expect(manager.isFollowingFairy(fairyId)).toBe(true)
		})

		it('should stop previous following when starting to follow a new fairy', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const firstAgent = fairyApp.agents.getAgents()[0]!
			const fairy1Id = firstAgent.id

			// Create another agent with explicit config to avoid automatic creation
			const newId = fairyApp.agents.createNewFairyConfig()
			fairyApp.agents.syncAgentsWithConfigs(
				{
					[fairy1Id]: {
						name: 'Agent 1',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'aries', moon: 'aries', rising: 'aries' },
					},
					[newId]: {
						name: 'Agent 2',
						outfit: { body: 'plain' as any, hat: 'ears' as any, wings: 'plain' as any },
						sign: { sun: 'taurus', moon: 'taurus', rising: 'taurus' },
					},
				},
				options
			)

			const agents = fairyApp.agents.getAgents()
			const fairy2Id = agents.find((a) => a.id !== fairy1Id)?.id

			if (!fairy2Id) {
				throw new Error('Expected second agent to be created')
			}

			// Mock both agents
			vi.spyOn(agents[0]!, 'getEntity').mockReturnValue({
				position: { x: 0, y: 0 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			vi.spyOn(agents[1]!, 'getEntity').mockReturnValue({
				position: { x: 100, y: 100 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			manager.startFollowing(fairy1Id)
			expect(manager.getFollowingFairyId()).toBe(fairy1Id)

			manager.startFollowing(fairy2Id)
			expect(manager.getFollowingFairyId()).toBe(fairy2Id)
			expect(manager.isFollowingFairy(fairy1Id)).toBe(false)
		})

		it('should not start following non-existent fairy', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			manager.startFollowing('non-existent-fairy')

			expect(manager.isFollowing()).toBe(false)
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'Could not find fairy agent with id:',
				'non-existent-fairy'
			)

			consoleWarnSpy.mockRestore()
		})
	})

	describe('stopFollowing', () => {
		it('should stop following any fairy', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const fairyId = agents[0]!.id

			vi.spyOn(agents[0]!, 'getEntity').mockReturnValue({
				position: { x: 0, y: 0 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			manager.startFollowing(fairyId)
			expect(manager.isFollowing()).toBe(true)

			manager.stopFollowing()
			expect(manager.isFollowing()).toBe(false)
			expect(manager.getFollowingFairyId()).toBeNull()
		})

		it('should be safe to call when not following', () => {
			expect(() => manager.stopFollowing()).not.toThrow()
		})
	})

	describe('zoomToFairy', () => {
		it('should zoom to fairy position', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			vi.spyOn(agent, 'getEntity').mockReturnValue({
				position: { x: 100, y: 200 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			const zoomToBoundsSpy = vi.spyOn(editor, 'zoomToBounds')

			manager.zoomToFairy(agent)

			expect(zoomToBoundsSpy).toHaveBeenCalled()
		})

		it('should switch page when fairy is on different page', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			const newPageId = PageRecordType.createId()
			editor.createPage({ id: newPageId, name: 'New Page' })

			vi.spyOn(agent, 'getEntity').mockReturnValue({
				position: { x: 100, y: 200 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: newPageId,
			})

			const setCurrentPageSpy = vi.spyOn(editor, 'setCurrentPage')

			manager.zoomToFairy(agent)

			expect(setCurrentPageSpy).toHaveBeenCalledWith(newPageId)
		})

		it('should not crash when entity is null', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const agent = agents[0]!

			// @ts-expect-error - mock return value is not typed
			vi.spyOn(agent, 'getEntity').mockReturnValue(null)

			expect(() => manager.zoomToFairy(agent)).not.toThrow()
		})
	})

	describe('reset', () => {
		it('should stop following when reset', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const fairyId = agents[0]!.id

			vi.spyOn(agents[0]!, 'getEntity').mockReturnValue({
				position: { x: 0, y: 0 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			manager.startFollowing(fairyId)
			expect(manager.isFollowing()).toBe(true)

			manager.reset()
			expect(manager.isFollowing()).toBe(false)
		})
	})

	describe('dispose', () => {
		it('should stop following when disposed', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}
			fairyApp.agents.syncAgentsWithConfigs({}, options)
			const agents = fairyApp.agents.getAgents()
			const fairyId = agents[0]!.id

			vi.spyOn(agents[0]!, 'getEntity').mockReturnValue({
				position: { x: 0, y: 0 },
				flipX: false,
				isSelected: false,
				pose: 'idle' as const,
				gesture: null,
				currentPageId: editor.getCurrentPageId(),
			})

			manager.startFollowing(fairyId)
			expect(manager.isFollowing()).toBe(true)

			manager.dispose()
			expect(manager.isFollowing()).toBe(false)
		})
	})
})
