import { DotcomActor, expect, test } from '../fixtures/scenario-test'

const ROOT_URL = 'http://localhost:3000'

type GalleryTab = 'recent' | 'shared' | 'archive'

// The gallery is behind `ui_v3`, which is off for the test users. The app reads its flags once at
// boot, so the override has to be in place before the next page load.
async function enableUiV3(actor: DotcomActor) {
	await actor.context.route('**/api/app/feature-flags', async (route) => {
		const response = await route.fetch()
		const flags = await response.json()
		await route.fulfill({ response, json: { ...flags, ui_v3: { enabled: true } } })
	})
}

async function getWorkspaceId(actor: DotcomActor, workspaceName: string) {
	const handle = await actor.page.waitForFunction((name) => {
		const app = (window as any).app
		return app
			?.getWorkspaceMemberships()
			.find((m: { group?: { name: string } }) => m.group?.name === name)?.groupId
	}, workspaceName)
	return (await handle.jsonValue()) as string
}

async function openGallery(actor: DotcomActor, workspaceId: string) {
	await actor.page.goto(`${ROOT_URL}/w/${workspaceId}`)
	await expect(actor.page.getByTestId('tla-workspace-home')).toBeVisible()
}

async function selectTab(actor: DotcomActor, tab: GalleryTab) {
	const tabButton = actor.page.getByTestId(`tla-workspace-tab-${tab}`)
	await tabButton.click()
	await expect(tabButton).toHaveAttribute('aria-selected', 'true')
}

function boardCard(actor: DotcomActor, fileName: string) {
	return actor.page.getByTestId('tla-board-card').filter({ hasText: fileName })
}

async function chooseFromCardMenu(actor: DotcomActor, fileName: string, item: string) {
	await boardCard(actor, fileName).click({ button: 'right' })
	await actor.page.getByRole('menuitem', { name: item, exact: true }).click()
}

test.describe('archived boards', () => {
	test('archiving moves a board to the archive tab for every member, and either can restore it', async ({
		owner,
		member,
		scenario,
	}) => {
		const { workspaceName, fileName } = await scenario.createWorkspaceWithMember({ owner, member })
		const workspaceId = await getWorkspaceId(owner, workspaceName)

		await enableUiV3(owner)
		await enableUiV3(member)
		await openGallery(owner, workspaceId)
		await openGallery(member, workspaceId)
		await selectTab(member, 'archive')
		await expect(boardCard(member, fileName)).toHaveCount(0)

		await test.step('owner pins, then archives the board', async () => {
			await chooseFromCardMenu(owner, fileName, 'Pin file')
			await expect(boardCard(owner, fileName)).toHaveAttribute('data-is-pinned', 'true')

			await chooseFromCardMenu(owner, fileName, 'Archive file')
			await expect(boardCard(owner, fileName)).toHaveCount(0)
		})

		await test.step('the board shows under archive, unpinned, for both users', async () => {
			await expect(boardCard(member, fileName)).toBeVisible()
			await selectTab(owner, 'archive')
			await expect(boardCard(owner, fileName)).toHaveAttribute('data-is-pinned', 'false')
		})

		await test.step('an archived board has no pin item', async () => {
			await boardCard(owner, fileName).click({ button: 'right' })
			await expect(owner.page.getByRole('menuitem', { name: 'Unarchive file' })).toBeVisible()
			await expect(owner.page.getByRole('menuitem', { name: /^(Pin|Unpin) file$/ })).toHaveCount(0)
			await owner.page.keyboard.press('Escape')
		})

		await test.step('the member unarchives it and the owner sees it return', async () => {
			await chooseFromCardMenu(member, fileName, 'Unarchive file')
			await expect(boardCard(member, fileName)).toHaveCount(0)
			await expect(boardCard(owner, fileName)).toHaveCount(0)
			await selectTab(owner, 'recent')
			await expect(boardCard(owner, fileName)).toBeVisible()
		})
	})

	test('the archive item is hidden without ui_v3', async ({ owner, scenario }) => {
		const { fileName } = await scenario.createPersonalFile(owner)
		const fileLink = owner.sidebar.getFileByName(fileName)
		await fileLink.hover()
		await fileLink.getByRole('button').click()
		await expect(owner.page.getByRole('menuitem', { name: 'Pin file' })).toBeVisible()
		await expect(owner.page.getByRole('menuitem', { name: 'Archive file' })).toHaveCount(0)
	})
})
