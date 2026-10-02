import { MAX_WORKSPACE_NAME_LENGTH } from '@tldraw/dotcom-shared'
import { expect, test } from '../fixtures/scenario-test'

test.describe.configure({ mode: 'serial' })

test.describe('command palette', () => {
	test('opens a file by name', async ({ owner, scenario }) => {
		const firstName = scenario.name('palette first')
		const secondName = scenario.name('palette second')
		const first = await scenario.createPersonalFile(owner, firstName)
		const second = await scenario.createPersonalFile(owner, secondName)
		await owner.sidebar.expectFileActive(secondName)

		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		const input = owner.page.getByTestId('command-palette.input')
		await expect(input).toBeFocused()
		await input.fill(firstName)
		await owner.page.keyboard.press('Enter')

		await expect(owner.page).toHaveURL(first.url)
		await owner.sidebar.expectFileActive(firstName)

		// The current file is never offered, so go back to the second one before checking recents.
		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		const firstId = first.url.split('/f/')[1]
		await expect(owner.page.getByTestId(`command-palette.item.file:${firstId}`)).toHaveCount(0)
		await input.fill(secondName)
		await owner.page.keyboard.press('Enter')
		await expect(owner.page).toHaveURL(second.url)

		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		await expect(owner.page.getByTestId(`command-palette.recent.file:${firstId}`)).toBeVisible()
		await owner.page.keyboard.press('Escape')
	})

	test('labels file results with "Go to file"', async ({ owner, scenario }) => {
		const fileName = scenario.name('palette label')
		const file = await scenario.createPersonalFile(owner, fileName)
		await scenario.createPersonalFile(owner, scenario.name('palette label other'))

		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		await owner.page.getByTestId('command-palette.input').fill(fileName)
		const fileId = file.url.split('/f/')[1]
		await expect(owner.page.getByTestId(`command-palette.item.file:${fileId}`)).toContainText(
			`Go to file: ${fileName}`
		)

		await owner.goto(file.url)
		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		await owner.page.getByTestId('command-palette.input').fill(fileName)
		await expect(owner.page.getByTestId(`command-palette.item.file:${fileId}`)).toHaveCount(0)
		await owner.page.keyboard.press('Escape')
	})

	test('tells switching workspace apart from moving the file', async ({ owner, scenario }) => {
		const workspaceName = scenario.name('palette ws').trim().slice(0, MAX_WORKSPACE_NAME_LENGTH)
		const file = await scenario.createPersonalFile(owner, scenario.name('palette ws file'))
		const fileId = file.url.split('/f/')[1]
		await owner.sidebar.createWorkspace(workspaceName)

		await owner.goto(file.url)
		await owner.editor.ensureSidebarOpen()
		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		await owner.page.getByTestId('command-palette.input').fill(`switch workspace ${workspaceName}`)

		const switchRow = owner.page.locator('[data-testid^="command-palette.item.workspace:"]', {
			hasText: workspaceName,
		})
		await expect(switchRow).toContainText(`Switch workspace: ${workspaceName}`)

		await owner.page.getByTestId('command-palette.input').fill(`move file to ${workspaceName}`)
		const moveRow = owner.page.locator('[data-testid^="command-palette.item.file-workspace-"]', {
			hasText: workspaceName,
		})
		await expect(moveRow).toContainText(`Move file to: ${workspaceName}`)
		// No-op rows are hidden: the file already lives in the home workspace.
		await expect(owner.page.getByTestId('command-palette.item.file-my-files')).toHaveCount(0)

		await owner.page.getByTestId('command-palette.input').fill(`switch workspace ${workspaceName}`)
		await switchRow.click()
		await expect(owner.page).not.toHaveURL(file.url)
		await owner.sidebar.expectActiveWorkspace(workspaceName)

		// The file never moved: it is still in the home workspace.
		const stillInHome = await owner.page.evaluate((id) => {
			const app = (window as any).app
			return (
				(app.getFile(id)?.owningGroupId ?? app.getHomeWorkspaceId()) === app.getHomeWorkspaceId()
			)
		}, fileId)
		expect(stillInHome).toBe(true)
	})

	test('offers the file delete next to the shape delete', async ({ owner, scenario }) => {
		await scenario.createPersonalFile(owner, scenario.name('palette delete'))
		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('r')
		await owner.page.mouse.move(400, 300)
		await owner.page.mouse.down()
		await owner.page.mouse.move(500, 400)
		await owner.page.mouse.up()
		await owner.editor.expectShapesCount(1)

		await owner.page.keyboard.press('ControlOrMeta+k')
		await owner.page.getByTestId('command-palette.input').fill('delete')
		await expect(owner.page.getByTestId('command-palette.item.delete')).toBeVisible()
		await expect(owner.page.getByTestId('command-palette.item.file-delete')).toHaveText(
			/Delete file/
		)
		await owner.page.keyboard.press('Escape')
	})

	test('creates a new file', async ({ owner }) => {
		const before = owner.page.url()
		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		await owner.page.getByTestId('command-palette.input').fill('new file')
		await owner.page.keyboard.press('Enter')
		await expect(owner.page).not.toHaveURL(before)
	})

	test('toggles the sidebar', async ({ owner }) => {
		await owner.editor.ensureSidebarOpen()
		await owner.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await owner.page.keyboard.press('ControlOrMeta+k')
		await owner.page.getByTestId('command-palette.input').fill('toggle sidebar')
		await owner.page.keyboard.press('Enter')
		await owner.sidebar.expectIsNotVisible()
	})

	test('opens for signed-out visitors without crashing the editor', async ({ actors }) => {
		const visitor = await actors.open('visitor', { goto: false })
		const pageErrors: Error[] = []
		visitor.page.on('pageerror', (error) => pageErrors.push(error))
		await visitor.goto()
		await expect(visitor.page.getByTestId('tla-sign-in-button')).toBeVisible()

		await visitor.page.getByTestId('canvas').click({ position: { x: 300, y: 300 } })
		await visitor.page.keyboard.press('ControlOrMeta+k')
		await expect(visitor.page.getByTestId('command-palette.input')).toBeVisible()
		await visitor.page.keyboard.press('Escape')
		await expect(visitor.page.getByTestId('command-palette')).toBeHidden()
		await expect(visitor.page.getByTestId('canvas')).toBeVisible()
		expect(pageErrors).toEqual([])
	})
})
