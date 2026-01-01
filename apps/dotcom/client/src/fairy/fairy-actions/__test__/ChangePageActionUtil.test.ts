import { createAgentAction } from '@tldraw/fairy-shared'
import { Editor, PageRecordType } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentHelpers } from '../../fairy-agent/AgentHelpers'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { ChangePageActionUtil } from '../ChangePageActionUtil'
import { createTestAgent, createTestEditor } from './fairy-actions-tests-shared'

describe('ChangePageActionUtil', () => {
	let editor: Editor
	let agent: FairyAgent
	let changePageUtil: ChangePageActionUtil

	beforeEach(() => {
		editor = createTestEditor()
		agent = createTestAgent(editor)
		changePageUtil = new ChangePageActionUtil(agent)
	})

	afterEach(() => {
		editor.dispose()
	})

	describe('applyAction', () => {
		it('should not apply incomplete actions', () => {
			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Page 2',
				intent: 'test',
				complete: false,
				time: 0,
			})

			const setCurrentPageSpy = vi.spyOn(editor, 'setCurrentPage')
			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			expect(setCurrentPageSpy).not.toHaveBeenCalled()
		})

		it('should change to existing page by name', () => {
			// Create a second page
			const page2Id = PageRecordType.createId()
			editor.createPage({ name: 'Page 2', id: page2Id })

			const initialPageId = editor.getCurrentPageId()

			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Page 2',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			// Verify the current page actually changed
			expect(editor.getCurrentPageId()).toBe(page2Id)
			expect(editor.getCurrentPageId()).not.toBe(initialPageId)
		})

		it('should update fairy entity current page ID', () => {
			const page2Id = PageRecordType.createId()
			editor.createPage({ name: 'Page 2', id: page2Id })

			const initialFairyPageId = agent.getEntity().currentPageId

			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Page 2',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			// Verify the fairy entity's current page ID actually changed
			const newFairyPageId = agent.getEntity().currentPageId
			expect(newFairyPageId).toBe(page2Id)
			expect(newFairyPageId).not.toBe(initialFairyPageId)
		})

		it('should move fairy to center of viewport on new page', () => {
			const page2Id = PageRecordType.createId()
			editor.createPage({ name: 'Page 2', id: page2Id })

			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Page 2',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).toHaveBeenCalled()
		})

		it('should schedule message if page does not exist', () => {
			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Nonexistent Page',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			expect(scheduleSpy).toHaveBeenCalled()
			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'data' in scheduleCall &&
				Array.isArray(scheduleCall.data)
			) {
				expect(scheduleCall.data[0]).toContain("couldn't find a page named")
				expect(scheduleCall.data[0]).toContain('Nonexistent Page')
			}
		})

		it('should list available pages in error message', () => {
			const page2Id = PageRecordType.createId()
			const page3Id = PageRecordType.createId()
			editor.createPage({ name: 'Page 2', id: page2Id })
			editor.createPage({ name: 'Page 3', id: page3Id })

			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Invalid Page',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			expect(scheduleSpy).toHaveBeenCalled()
			const scheduleCall = scheduleSpy.mock.calls[0][0]
			if (
				typeof scheduleCall === 'object' &&
				scheduleCall !== null &&
				!Array.isArray(scheduleCall) &&
				'data' in scheduleCall &&
				Array.isArray(scheduleCall.data)
			) {
				expect(scheduleCall.data[0]).toContain('Available pages are:')
				expect(scheduleCall.data[0]).toContain('Page 2')
				expect(scheduleCall.data[0]).toContain('Page 3')
			}
		})

		it('should not move fairy if page does not exist', () => {
			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Nonexistent',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			expect(agent.position.moveTo).not.toHaveBeenCalled()
		})

		it('should handle changing to page with same name as current page', () => {
			// Get the default page name
			const currentPage = editor.getCurrentPage()
			const currentPageId = editor.getCurrentPageId()

			const action = createAgentAction({
				_type: 'change-page',
				pageName: currentPage.name,
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			// Should still be on the same page
			expect(editor.getCurrentPageId()).toBe(currentPageId)
		})

		it('should handle page names with special characters', () => {
			const specialPageId = PageRecordType.createId()
			editor.createPage({ name: 'Page-With-Dashes & Symbols!', id: specialPageId })

			const initialPageId = editor.getCurrentPageId()

			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'Page-With-Dashes & Symbols!',
				intent: 'test',
				complete: true,
				time: 0,
			})

			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			// Verify the current page actually changed
			expect(editor.getCurrentPageId()).toBe(specialPageId)
			expect(editor.getCurrentPageId()).not.toBe(initialPageId)
		})

		it('should be case-sensitive when matching page names', () => {
			const page2Id = PageRecordType.createId()
			editor.createPage({ name: 'Page 2', id: page2Id })

			const action = createAgentAction({
				_type: 'change-page',
				pageName: 'page 2', // lowercase
				intent: 'test',
				complete: true,
				time: 0,
			})

			const scheduleSpy = vi.spyOn(agent, 'schedule')
			const helpers = new AgentHelpers(agent)
			changePageUtil.applyAction(action, helpers)

			// Should not find the page due to case mismatch
			expect(scheduleSpy).toHaveBeenCalled()
		})
	})
})
