import fs from 'fs'
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, test as base } from '@playwright/test'
import type { Browser, BrowserContext, Download, Locator, Page, TestInfo } from '@playwright/test'
import { NUMBER_OF_USERS } from '../consts'
import { Database, getTestUserEmail } from './Database'
import { DeleteFileDialog } from './DeleteFileDialog'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { getStorageStateFileName } from './helpers'
import { HomePage } from './HomePage'
import { ImportHelper } from './ImportHelper'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'
import { SignInDialog } from './SignInDialog'
import { WorkspaceInviteDialog } from './WorkspaceInviteDialog'

type SignedInActorName = 'owner' | 'member'
type DotcomActorName = SignedInActorName | 'visitor'
type SharedLinkType = 'edit' | 'view' | 'no-access'
type WorkspaceMemberRole = 'owner' | 'member'

const SCENARIO_USER_POOL_START = 4
const ROOT_URL = 'http://localhost:3000'
const MENU_INTERACTION_TIMEOUT = 5_000

export async function selectTlaMenuOption(page: Page, select: Locator, optionLabel: string) {
	await select.click({ timeout: MENU_INTERACTION_TIMEOUT })
	const openListbox = page.locator('[role="listbox"][data-state="open"]')
	await expect(openListbox).toBeVisible({ timeout: MENU_INTERACTION_TIMEOUT })
	await openListbox
		.getByRole('option', { name: optionLabel, exact: true })
		.click({ timeout: MENU_INTERACTION_TIMEOUT })
	await expect(openListbox).not.toBeVisible({ timeout: MENU_INTERACTION_TIMEOUT })
}

interface SignedInActorAccount {
	email: string
	storageState: string
}

interface ScenarioWorkerFixtures {
	actorAccounts: Record<SignedInActorName, SignedInActorAccount>
}

interface ScenarioFixtures {
	actors: DotcomActors
	owner: DotcomActor
	member: DotcomActor
	visitor: DotcomActor
	scenario: DotcomScenario
	setupAndCleanup: void
}

interface LegacyRouteFixture {
	slug: string
	readonlySlug: string
	legacyReadonlySlug: string
	snapshotSlug: string
	historyTimestamp: string
	urls: {
		room: string
		readonly: string
		legacyReadonly: string
		snapshot: string
		history: string
		historySnapshot: string
	}
}

export class DotcomActor {
	readonly sidebar: Sidebar
	readonly editor: Editor
	readonly homePage: HomePage
	readonly shareMenu: ShareMenu
	readonly deleteFileDialog: DeleteFileDialog
	readonly errorPage: ErrorPage
	readonly importHelper: ImportHelper
	readonly signInDialog: SignInDialog
	readonly workspaceInviteDialog: WorkspaceInviteDialog

	constructor(
		readonly name: DotcomActorName,
		readonly page: Page,
		readonly context: BrowserContext,
		readonly email?: string
	) {
		this.sidebar = new Sidebar(page)
		this.editor = new Editor(page, this.sidebar)
		this.homePage = new HomePage(page, this.editor)
		this.shareMenu = new ShareMenu(page)
		this.deleteFileDialog = new DeleteFileDialog(page)
		this.errorPage = new ErrorPage(page)
		this.importHelper = new ImportHelper(page)
		this.signInDialog = new SignInDialog(page)
		this.workspaceInviteDialog = new WorkspaceInviteDialog(page)
	}

	async goto(url = 'http://localhost:3000/') {
		await this.homePage.goto(url)
		await this.waitForAppReady()
	}

	async waitForAppReady() {
		await this.homePage.isLoaded()
		await this.waitForEditorReady()
		await this.waitForAuthLoaded()
		await this.waitForAppStoreHydrated()
		await this.waitForFileRoomConnected()
		await this.waitForVisitorAccessMetadata()
		await this.waitForMutationResolution()
	}

	async waitForAuthLoaded() {
		await this.page.waitForFunction(
			([isSignedIn]) => {
				const app = (window as any).app
				const editor = (window as any).editor
				const path = window.location.pathname
				const isAppRoute = path === '/' || path.startsWith('/f/')
				const isLegacyReadonlyRoute = path.startsWith('/ro/') || path.startsWith('/v/')
				const hasMountedCanvas = !!document.querySelector('[data-testid="canvas"]')

				if (isSignedIn && isAppRoute) return !!app?.getUser?.()
				if (isSignedIn && isLegacyReadonlyRoute)
					return !!app?.getUser?.() || !!editor || hasMountedCanvas
				if (isSignedIn) return !!app?.getUser?.() || !!editor
				return (
					!!document.querySelector('[data-testid="tla-sign-in-button"]') ||
					!!document.querySelector('[data-testid="tla-sidebar-toggle"]')
				)
			},
			[!!this.email]
		)
	}

	async waitForAppStoreHydrated() {
		if (!this.email) return
		await this.page.waitForFunction(() => {
			const app = (window as any).app
			const path = window.location.pathname
			const isAppRoute = path === '/' || path.startsWith('/f/')
			if (!isAppRoute) return true

			return !!app?.getUser?.() && Array.isArray(app?.getUserFileStates?.())
		})
	}

	async waitForEditorReady() {
		await this.page.waitForFunction(() => {
			const editor = (window as any).editor
			if (editor?.getCurrentPageId?.()) return true

			const path = window.location.pathname
			const hasMountedCanvas = !!document.querySelector('[data-testid="canvas"]')
			return hasMountedCanvas && (path.startsWith('/ro/') || path.startsWith('/v/'))
		})
	}

	async waitForFileRoomConnected() {
		await this.page.waitForFunction(() => {
			const editor = (window as any).editor
			if (!editor?.store) {
				const path = window.location.pathname
				return (
					!!document.querySelector('[data-testid="canvas"]') &&
					(path.startsWith('/ro/') || path.startsWith('/v/'))
				)
			}

			const status = editor.store.status
			return status === undefined || status === 'synced-remote'
		})
	}

	async waitForVisitorAccessMetadata() {
		await this.page.waitForFunction(() => {
			const editor = (window as any).editor
			if (!editor?.getIsReadonly) {
				const path = window.location.pathname
				return (
					!!document.querySelector('[data-testid="canvas"]') &&
					(path.startsWith('/ro/') || path.startsWith('/v/'))
				)
			}

			// Calling getIsReadonly proves the mounted editor has received the
			// current access mode for signed-out visitors and signed-in guests.
			return typeof editor.getIsReadonly() === 'boolean'
		})
	}

	async waitForSessionClosed(timeout = 20000) {
		await expect
			.poll(
				async () => {
					return await this.page.evaluate(() => {
						const editor = (window as any).editor
						return editor?.getCollaborators?.().length ?? 0
					})
				},
				{ timeout }
			)
			.toBe(0)
	}

	async waitForMutationResolution() {
		await this.page.evaluate(async () => {
			await (window as any).app?.z?.__e2e__waitForMutationResolution?.()
		})
	}

	async getCollaboratorCount() {
		return await this.page.evaluate(() => (window as any).editor?.getCollaborators?.().length ?? 0)
	}

	async expectCollaboratorCount(count: number, timeout = 10000) {
		await expect.poll(() => this.getCollaboratorCount(), { timeout }).toBe(count)
	}

	async getIsReadonly() {
		return await this.page.evaluate(() => {
			const editorReadonly = (window as any).editor?.getIsReadonly?.()
			if (typeof editorReadonly === 'boolean') return editorReadonly

			const path = window.location.pathname
			return (
				!!document.querySelector('[data-testid="canvas"]') &&
				(path.startsWith('/ro/') || path.startsWith('/v/'))
			)
		})
	}

	async expectReadonly(readonly: boolean, timeout = 10000) {
		await expect.poll(() => this.getIsReadonly(), { timeout }).toBe(readonly)
	}

	async close() {
		await this.context.close()
	}
}

class DotcomActors {
	private readonly openActors: DotcomActor[] = []

	constructor(
		private readonly browser: Browser,
		private readonly actorAccounts: Record<SignedInActorName, SignedInActorAccount>
	) {}

	async open(
		name: DotcomActorName,
		opts: { url?: string; allowClipboard?: boolean; goto?: boolean } = {}
	) {
		const account = name === 'visitor' ? undefined : this.actorAccounts[name]
		const context = await this.browser.newContext({
			storageState: account?.storageState,
		})

		if (opts.allowClipboard ?? true) {
			await context.grantPermissions(['clipboard-read', 'clipboard-write'])
		}

		const page = await context.newPage()
		await setupClerkTestingToken({ page })

		const actor = new DotcomActor(name, page, context, account?.email)
		this.openActors.push(actor)

		if (opts.goto ?? true) {
			await actor.goto(opts.url)
		}

		return actor
	}

	async closeAll() {
		await Promise.allSettled(this.openActors.splice(0).map((actor) => actor.close()))
	}
}

class DotcomScenario {
	readonly id: string
	private readonly database: Database

	constructor(private readonly testInfo: TestInfo) {
		this.id = getScenarioId(testInfo)
		// Scenario actors live in the scenario user pool, so the database must use the same index
		// for its index-based helpers to target the right Clerk accounts.
		this.database = new Database(null, getScenarioUserIndex(testInfo.parallelIndex))
	}

	name(label: string) {
		return `${this.id} ${label}`
	}

	async createPersonalFile(actor: DotcomActor, fileName = this.name('file')) {
		await actor.editor.ensureSidebarOpen()
		await this.switchToHomeIfAvailable(actor)
		await actor.sidebar.createNewDocument(fileName)
		await actor.sidebar.expectFileActive(fileName)
		return { fileName, url: actor.page.url() }
	}

	async createSharedFile(
		actor: DotcomActor,
		linkType: Exclude<SharedLinkType, 'no-access'> = 'edit',
		fileName = this.name(`${linkType} shared file`)
	) {
		const file = await this.createPersonalFile(actor, fileName)
		const sharedUrl = await this.shareFile(actor, linkType)
		return { ...file, sharedUrl, linkType }
	}

	async createGuestFile(opts: {
		owner: DotcomActor
		guest: DotcomActor
		linkType: Exclude<SharedLinkType, 'no-access'>
		fileName?: string
	}) {
		const file = await this.createSharedFile(opts.owner, opts.linkType, opts.fileName)
		await opts.guest.goto(file.sharedUrl)
		return file
	}

	async createGuestEditFile(owner: DotcomActor, guest: DotcomActor, fileName?: string) {
		return await this.createGuestFile(
			fileName === undefined
				? { owner, guest, linkType: 'edit' }
				: { owner, guest, fileName, linkType: 'edit' }
		)
	}

	async createGuestViewFile(owner: DotcomActor, guest: DotcomActor, fileName?: string) {
		return await this.createGuestFile(
			fileName === undefined
				? { owner, guest, linkType: 'view' }
				: { owner, guest, fileName, linkType: 'view' }
		)
	}

	async createRectangle(actor: DotcomActor) {
		await actor.page.getByTestId('tools.rectangle').click()
		await actor.page.locator('.tl-background').click()
		await actor.editor.expectShapesCount(1)
		await actor.waitForMutationResolution()
	}

	async shareFile(actor: DotcomActor, linkType: Exclude<SharedLinkType, 'no-access'> = 'edit') {
		await actor.shareMenu.open()
		await this.setSharedLinkType(actor, linkType)
		const url = await actor.shareMenu.copyLink()
		await actor.page.keyboard.press('Escape')
		return url
	}

	async setSharedLinkType(actor: DotcomActor, linkType: SharedLinkType) {
		if (!(await actor.shareMenu.inviteTabButton.isVisible().catch(() => false))) {
			await actor.shareMenu.open()
		}
		await actor.shareMenu.ensureTabSelected('invite')

		if (linkType === 'no-access') {
			await actor.page.getByRole('switch').uncheck()
			await actor.waitForMutationResolution()
			return
		}

		await actor.page.getByRole('switch').check()
		const select = actor.page.getByTestId('shared-link-type-select')
		const expectedLabel = linkType === 'edit' ? 'Editor' : 'Viewer'
		if ((await select.innerText()) !== expectedLabel) {
			await selectTlaMenuOption(actor.page, select, expectedLabel)
		}
		await expect(select).toHaveText(expectedLabel)
		await actor.waitForMutationResolution()
	}

	async publishFile(actor: DotcomActor) {
		await actor.shareMenu.open()
		await actor.shareMenu.publishFile()
		const url = await actor.shareMenu.copyLink()
		await actor.page.keyboard.press('Escape')
		await actor.waitForMutationResolution()
		return url
	}

	async createPublishedFile(actor: DotcomActor, fileName = this.name('published file')) {
		const file = await this.createPersonalFile(actor, fileName)
		const publishedUrl = await this.publishFile(actor)
		return { ...file, publishedUrl }
	}

	async importFileFromUrl(actor: DotcomActor, url?: string) {
		await actor.importHelper.mockUrl(url)
		await actor.importHelper.navigate(url)
		await actor.page.waitForURL(/\/f\//)
		await actor.waitForAppReady()
		return { fileName: await actor.editor.getCurrentFileName(), url: actor.page.url() }
	}

	async downloadFileFromSidebar(actor: DotcomActor, fileName: string): Promise<Download> {
		await actor.editor.ensureSidebarOpen()
		const fileLink = actor.sidebar.getFileByName(fileName)
		await fileLink.hover()
		await fileLink.getByRole('button').click()

		const downloadPromise = actor.page.waitForEvent('download')
		await actor.page.getByRole('menuitem', { name: 'Download' }).click()
		return await downloadPromise
	}

	async publishChanges(actor: DotcomActor) {
		if (!(await actor.shareMenu.publishTabButton.isVisible().catch(() => false))) {
			await actor.shareMenu.open()
		}
		await actor.shareMenu.publishChanges()
		await actor.page.keyboard.press('Escape')
		await actor.waitForMutationResolution()
	}

	async createLegacyRouteFixture(actor: DotcomActor): Promise<LegacyRouteFixture> {
		const slug = this.id.slice(0, 96)
		let fixture: Omit<LegacyRouteFixture, 'urls'> | null = null
		let lastError = ''

		for (let attempt = 0; attempt < 30; attempt++) {
			const response = await actor.page.request.post(`${ROOT_URL}/api/app/__test__/legacy-room`, {
				data: {
					slug,
					readonlySlug: `${slug}-ro`,
					legacyReadonlySlug: `${slug}-v`,
					snapshotSlug: `v2_c_${slug}`,
					historyTimestamp: '2020-01-02T03:04:05.000Z',
				},
			})

			if (response.ok()) {
				fixture = (await response.json()) as Omit<LegacyRouteFixture, 'urls'>
				break
			}

			lastError = `${response.status()} ${await response.text()}`
			await actor.page.waitForTimeout(500)
		}

		if (!fixture) throw new Error(`Legacy route fixture was not created: ${lastError}`)
		return {
			...fixture,
			urls: {
				room: `${ROOT_URL}/r/${fixture.slug}`,
				readonly: `${ROOT_URL}/ro/${fixture.readonlySlug}`,
				legacyReadonly: `${ROOT_URL}/v/${fixture.legacyReadonlySlug}`,
				snapshot: `${ROOT_URL}/s/${fixture.snapshotSlug}`,
				history: `${ROOT_URL}/r/${fixture.slug}/history`,
				historySnapshot: `${ROOT_URL}/r/${fixture.slug}/history/${fixture.historyTimestamp}`,
			},
		}
	}

	async createWorkspaceWithMember(opts: {
		owner: DotcomActor
		member: DotcomActor
		workspaceName?: string
		fileName?: string
	}) {
		const invite = await this.createPendingWorkspaceInvite(opts)

		await opts.member.goto(invite.inviteUrl)
		await opts.member.editor.ensureSidebarOpen()
		await opts.member.workspaceInviteDialog.acceptInvitation()
		await opts.member.waitForMutationResolution()
		await opts.member.sidebar.expectWorkspaceVisible(invite.workspaceName)
		await opts.member.sidebar.switchToWorkspace(invite.workspaceName)
		await opts.member.sidebar.expectFileVisible(invite.fileName)

		return invite
	}

	async createWorkspaceWithRemovedMember(opts: {
		owner: DotcomActor
		member: DotcomActor
		workspaceName?: string
		fileName?: string
	}) {
		const workspace = await this.createWorkspaceWithMember(opts)
		await this.removeWorkspaceMember({
			owner: opts.owner,
			workspaceName: workspace.workspaceName,
			memberUserId: workspace.memberUserId,
		})
		return workspace
	}

	async createPendingWorkspaceInvite(opts: {
		owner: DotcomActor
		member: DotcomActor
		workspaceName?: string
		fileName?: string
	}) {
		const workspaceName = opts.workspaceName ?? this.name('workspace')
		const fileName = opts.fileName ?? this.name('workspace file')

		await this.ensureGroupsReady(opts.owner)
		await this.ensureGroupsReady(opts.member)

		if (!opts.member.email) throw new Error('Workspace member actor is not signed in')
		const memberUserId = await this.database.getUserIdByEmail(opts.member.email)
		if (!memberUserId) throw new Error(`Member user not found: ${opts.member.email}`)

		await opts.owner.editor.ensureSidebarOpen()
		await this.switchToHomeIfAvailable(opts.owner)
		const { fileId } = await opts.owner.page.evaluate(
			async ({ workspaceName, fileName }) => {
				const app = (window as any).app
				const uniqueId = () => {
					const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-'
					const bytes = crypto.getRandomValues(new Uint8Array(21))
					return Array.from(bytes, (byte) => alphabet[byte & 63]).join('')
				}
				const workspaceId = uniqueId()
				const fileId = uniqueId()
				await app.z.mutate.createWorkspace({ id: workspaceId, name: workspaceName }).client
				await app.z.mutate.createFile({
					fileId,
					workspaceId,
					name: fileName,
					createSource: null,
					time: Date.now(),
				}).client
				await app.z.__e2e__waitForMutationResolution?.()
				return { fileId }
			},
			{ workspaceName, fileName }
		)
		await opts.owner.goto(`${ROOT_URL}/f/${fileId}`)
		await opts.owner.editor.ensureSidebarOpen()

		const inviteUrl = await opts.owner.sidebar.copyWorkspaceInviteLink(workspaceName)

		return { workspaceName, fileName, inviteUrl, memberUserId }
	}

	async removeWorkspaceMember(opts: {
		owner: DotcomActor
		workspaceName: string
		memberUserId: string
	}) {
		await opts.owner.sidebar.openWorkspaceSettings(opts.workspaceName)
		await selectTlaMenuOption(
			opts.owner.page,
			opts.owner.page.locator(`[id="workspace-member-role-${opts.memberUserId}"]`),
			'Remove'
		)
		await opts.owner.page.getByRole('button', { name: 'Remove member' }).click()
		await opts.owner.waitForMutationResolution()
		await opts.owner.page.keyboard.press('Escape')
	}

	async setWorkspaceMemberRole(opts: {
		owner: DotcomActor
		workspaceName: string
		memberUserId: string
		role: WorkspaceMemberRole
	}) {
		await opts.owner.sidebar.openWorkspaceSettings(opts.workspaceName)
		const memberRoleSelect = opts.owner.page.locator(
			`[id="workspace-member-role-${opts.memberUserId}"]`
		)
		const roleLabel = opts.role === 'owner' ? 'Owner' : 'Member'
		await selectTlaMenuOption(opts.owner.page, memberRoleSelect, roleLabel)
		await expect(memberRoleSelect).toHaveText(roleLabel)
		await opts.owner.waitForMutationResolution()
		await opts.owner.page.keyboard.press('Escape')
	}

	async downgradeClient(actor: DotcomActor) {
		const userId = await this.getSignedInActorUserId(actor)
		await actor.page.request.get(
			`http://localhost:3000/api/app/__test__/user/${userId}/downgrade-client`
		)
	}

	async upgradeClient(actor: DotcomActor) {
		const userId = await this.getSignedInActorUserId(actor)
		await actor.page.request.get(
			`http://localhost:3000/api/app/__test__/user/${userId}/upgrade-client`
		)
	}

	async ensureGroupsReady(actor: DotcomActor) {
		if (!actor.email) throw new Error(`Actor ${actor.name} is not signed in`)

		await this.database.ensureGroupsReadyByEmail(actor.email)
		await actor.goto()
		await actor.editor.ensureSidebarOpen()
	}

	private async getSignedInActorUserId(actor: DotcomActor) {
		if (!actor.email) throw new Error(`Actor ${actor.name} is not signed in`)
		const userId = await this.database.getUserIdByEmail(actor.email)
		if (!userId) throw new Error(`User not found: ${actor.email}`)
		return userId
	}

	private async switchToHomeIfAvailable(actor: DotcomActor) {
		if (
			await actor.page
				.getByTestId('tla-workspace-switcher')
				.isVisible()
				.catch(() => false)
		) {
			await actor.sidebar.switchToHomeWorkspace()
		}
	}
}

export const test = base.extend<ScenarioFixtures, ScenarioWorkerFixtures>({
	actorAccounts: [
		async ({ browser }, testUse, workerInfo) => {
			const userIndex = getScenarioUserIndex(workerInfo.parallelIndex)
			const owner = await ensureStorageState(browser, userIndex, 'huppy')
			const member = await ensureStorageState(browser, userIndex, 'suppy')
			await testUse({ owner, member })
		},
		{ scope: 'worker' },
	],
	setupAndCleanup: [
		async ({ actorAccounts: _actorAccounts }, testUse, testInfo) => {
			const database = new Database(null, getScenarioUserIndex(testInfo.parallelIndex))
			await database.reset()
			await testUse()
		},
		{ auto: true },
	],
	actors: async ({ browser, actorAccounts }, testUse) => {
		const actors = new DotcomActors(browser, actorAccounts)
		await testUse(actors)
		await actors.closeAll()
	},
	owner: async ({ actors }, testUse) => {
		await testUse(await actors.open('owner'))
	},
	member: async ({ actors }, testUse) => {
		await testUse(await actors.open('member'))
	},
	visitor: async ({ actors }, testUse) => {
		await testUse(await actors.open('visitor'))
	},
	scenario: async ({ browser: _browser }, testUse, testInfo) => {
		await testUse(new DotcomScenario(testInfo))
	},
})

async function ensureStorageState(
	browser: Browser,
	parallelIndex: number,
	user: 'huppy' | 'suppy'
): Promise<SignedInActorAccount> {
	const storageState = getStorageStateFileName(parallelIndex, user)
	const email = getTestUserEmail(parallelIndex, user)
	if (fs.existsSync(storageState)) {
		return { email, storageState }
	}

	await base.step(`Sign in ${user} actor`, async () => {
		const page = await browser.newPage({ storageState: undefined })
		await setupClerkTestingToken({ page })
		const sidebar = new Sidebar(page)
		const editor = new Editor(page, sidebar)
		const homePage = new HomePage(page, editor)

		await homePage.loginAs(email)
		await expect(page.getByTestId('tla-sidebar-layout')).toBeVisible()
		await page.context().storageState({ path: storageState })
		await page.close()
	})

	return { email, storageState }
}

function getScenarioId(testInfo: TestInfo) {
	const slug = testInfo.titlePath
		.slice(1)
		.join(' ')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64)

	const runId = process.env.GITHUB_RUN_ID ?? Date.now().toString(36)
	return `e2e-${runId}-w${testInfo.parallelIndex}-x${testInfo.repeatEachIndex}-r${testInfo.retry}-${slug}`
}

function getScenarioUserIndex(parallelIndex: number) {
	const userIndex = SCENARIO_USER_POOL_START + parallelIndex
	if (userIndex >= NUMBER_OF_USERS) {
		throw new Error(
			`Not enough Clerk test users for scenario worker ${parallelIndex}. Add more test users or lower the Playwright worker count.`
		)
	}
	return userIndex
}

export { expect } from '@playwright/test'
