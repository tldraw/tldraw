import { describe, expect, it, vi } from 'vitest'
import { TldrawApp } from './TldrawApp'

// Drive the real `uploadTldrFiles` on a bare prototype instance with the members it reads stubbed,
// avoiding a full TldrawApp (Zero/Clerk/router). Same approach as getWorkspaceFilesSorted.test.ts.
function createAppStub({
	ownedFileCount,
	maxNumberOfFiles,
}: {
	ownedFileCount: number
	maxNumberOfFiles: number
}) {
	const homeId = 'user:home'
	const groupFiles = Array.from({ length: ownedFileCount }, (_, i) => ({
		fileId: `file:${i}`,
		groupId: homeId,
		file: { id: `file:${i}`, owningGroupId: homeId, isDeleted: false },
	}))
	const uploadTldrFile = vi.fn(async (file: File) => ({ ok: true, value: { fileId: file.name } }))
	const addToast = vi.fn(() => 'toast:1')
	const app = Object.create(TldrawApp.prototype)
	Object.assign(app, {
		userId: homeId,
		config: { maxNumberOfFiles },
		workspaceMemberships$: { get: () => [{ groupId: homeId, groupFiles }] },
		abortController: new AbortController(),
		toasts: { addToast, removeToast: vi.fn(), toasts: { update: vi.fn() } },
		messages: {},
		getIntl: () => ({ formatMessage: () => '' }),
		trackEvent: vi.fn(),
		uploadTldrFile,
	})
	return { app: app as TldrawApp, uploadTldrFile, addToast }
}

function makeFiles(count: number) {
	return Array.from({ length: count }, (_, i) => new File(['{}'], `board-${i}.tldr`))
}

describe('uploadTldrFiles', () => {
	it('uploads a batch that fits in the remaining capacity', async () => {
		const { app, uploadTldrFile, addToast } = createAppStub({
			ownedFileCount: 198,
			maxNumberOfFiles: 200,
		})
		const onUploadError = vi.fn()

		await app.uploadTldrFiles(makeFiles(2), { source: 'file-drop', onUploadError })

		expect(uploadTldrFile).toHaveBeenCalledTimes(2)
		expect(onUploadError).not.toHaveBeenCalled()
		expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }))
	})

	it('refuses the whole batch before uploading when it exceeds the remaining capacity', async () => {
		// One slot left: a single-file preflight would pass, create the first file, then upload the
		// second before createFile rejects it — orphaning the second room and stacking two errors.
		const { app, uploadTldrFile, addToast } = createAppStub({
			ownedFileCount: 199,
			maxNumberOfFiles: 200,
		})
		const onUploadError = vi.fn()

		await app.uploadTldrFiles(makeFiles(2), { source: 'file-drop', onUploadError })

		expect(uploadTldrFile).not.toHaveBeenCalled()
		expect(onUploadError).toHaveBeenCalledTimes(1)
		expect(addToast).toHaveBeenCalledTimes(1)
		expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ keepOpen: true }))
	})

	it('still allows a single file into the last remaining slot', async () => {
		const { app, uploadTldrFile } = createAppStub({ ownedFileCount: 199, maxNumberOfFiles: 200 })

		await app.uploadTldrFiles(makeFiles(1), { source: 'file-drop' })

		expect(uploadTldrFile).toHaveBeenCalledTimes(1)
	})

	it('refuses a single file when the workspace is full', async () => {
		const { app, uploadTldrFile } = createAppStub({ ownedFileCount: 200, maxNumberOfFiles: 200 })
		const onUploadError = vi.fn()

		await app.uploadTldrFiles(makeFiles(1), { source: 'file-drop', onUploadError })

		expect(uploadTldrFile).not.toHaveBeenCalled()
		expect(onUploadError).toHaveBeenCalledTimes(1)
	})
})
