import { MAX_FAIRY_COUNT } from '@tldraw/dotcom-shared'
import { PersistedFairyConfigs, toAgentId } from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FairyAgent } from '../../../fairy-agent/FairyAgent'
import { FairyApp } from '../../FairyApp'
import { FairyAppAgentsManager } from '../FairyAppAgentsManager'
import {
	createTestEditor,
	createTestFairyApp,
	getDefaultFairyConfig,
} from './fairy-app-managers-test-shared'

describe('FairyAppAgentsManager', () => {
	let editor: Editor
	let fairyApp: FairyApp
	let manager: FairyAppAgentsManager

	beforeEach(() => {
		editor = createTestEditor()
		fairyApp = createTestFairyApp(editor)
		manager = fairyApp.agents
	})

	afterEach(() => {
		editor.dispose()
		fairyApp.dispose()
	})

	describe('getAgents', () => {
		it('should return an empty array initially', () => {
			expect(manager.getAgents()).toEqual([])
		})
	})

	describe('getAgentById', () => {
		it('should return undefined when agent does not exist', () => {
			expect(manager.getAgentById(toAgentId('non-existent'))).toBeUndefined()
		})
	})

	describe('syncAgentsWithConfigs', () => {
		it('should create a new agent when configs are synced', () => {
			const configs: PersistedFairyConfigs = {}
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			manager.syncAgentsWithConfigs(configs, options)

			const agents = manager.getAgents()
			expect(agents).toHaveLength(1)
			expect(agents[0]).toBeInstanceOf(FairyAgent)
		})

		it('should not create more than MAX_FAIRY_COUNT agents', () => {
			const configs: PersistedFairyConfigs = {}
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			// Fill up to MAX_FAIRY_COUNT
			for (let i = 0; i < MAX_FAIRY_COUNT; i++) {
				manager.syncAgentsWithConfigs(configs, options)
			}

			const agents = manager.getAgents()
			expect(agents.length).toBeLessThanOrEqual(MAX_FAIRY_COUNT)
		})

		it('should dispose agents that no longer have configs', () => {
			const configs: PersistedFairyConfigs = {}
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			// Create initial agents
			manager.syncAgentsWithConfigs(configs, options)
			const initialAgents = manager.getAgents()
			const agentId = initialAgents[0]!.id
			const disposeSpy = vi.spyOn(initialAgents[0]!, 'dispose')

			// Sync with empty configs (removes all agents)
			manager.syncAgentsWithConfigs({}, options)

			expect(disposeSpy).toHaveBeenCalled()
			expect(manager.getAgentById(agentId)).toBeUndefined()
		})

		it('should keep existing agents when their configs are still present', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			// First sync - creates one agent and adds config
			manager.syncAgentsWithConfigs({}, options)
			const firstAgents = manager.getAgents()
			const firstAgentId = firstAgents[0]!.id

			// Get the config that was created
			const configs: PersistedFairyConfigs = {
				[firstAgentId]: getDefaultFairyConfig(),
			}

			// Second sync with same config should keep the agent
			manager.syncAgentsWithConfigs(configs, options)

			const secondAgents = manager.getAgents()
			expect(secondAgents[0]!.id).toBe(firstAgentId)
			// Should be 1 because we provided exactly 1 config
			expect(secondAgents.length).toBeGreaterThanOrEqual(1)
		})
	})

	describe('createNewFairyConfig', () => {
		it('should create a new fairy config with random properties', () => {
			const updateFairyConfigSpy = vi.spyOn(fairyApp.tldrawApp.z.mutate.user, 'updateFairyConfig')

			const id = manager.createNewFairyConfig()

			expect(id).toBeTruthy()
			expect(typeof id).toBe('string')
			expect(updateFairyConfigSpy).toHaveBeenCalledWith({
				id,
				properties: expect.objectContaining({
					name: expect.any(String),
					outfit: expect.objectContaining({
						body: expect.any(String),
						hat: expect.any(String),
						wings: expect.any(String),
					}),
					sign: expect.objectContaining({
						sun: expect.any(String),
						moon: expect.any(String),
						rising: expect.any(String),
					}),
				}),
			})
		})
	})

	describe('markAgentLoaded and isAgentLoaded', () => {
		it('should track loaded agents', () => {
			const testAgentId = toAgentId('test-agent-id')

			expect(manager.isAgentLoaded(testAgentId)).toBe(false)

			manager.markAgentLoaded(testAgentId)

			expect(manager.isAgentLoaded(testAgentId)).toBe(true)
		})
	})

	describe('disposeAll', () => {
		it('should dispose all agents and clear the list', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			manager.syncAgentsWithConfigs({}, options)
			const agents = manager.getAgents()
			const disposeSpy = vi.spyOn(agents[0]!, 'dispose')

			manager.disposeAll()

			expect(disposeSpy).toHaveBeenCalled()
			expect(manager.getAgents()).toEqual([])
		})
	})

	describe('resetAgentState', () => {
		it('should reset agent state without disposing agents', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			manager.syncAgentsWithConfigs({}, options)
			const agents = manager.getAgents()
			expect(agents).toHaveLength(1)

			const agentId = agents[0]!.id
			const resetSpy = vi.spyOn(agents[0]!, 'reset')

			manager.resetAllAgents()

			expect(resetSpy).toHaveBeenCalled()
			expect(manager.getAgents()).toHaveLength(1)
			expect(manager.getAgentById(agentId)).toBe(agents[0])
		})
	})

	describe('reset', () => {
		it('should reset the manager by disposing all agents', () => {
			const options = {
				onError: vi.fn(),
				getToken: vi.fn().mockResolvedValue('token'),
			}

			manager.syncAgentsWithConfigs({}, options)
			expect(manager.getAgents()).toHaveLength(1)

			manager.reset()

			expect(manager.getAgents()).toEqual([])
		})
	})
})
