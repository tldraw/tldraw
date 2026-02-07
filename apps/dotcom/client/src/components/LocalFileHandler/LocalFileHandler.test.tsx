import { act, render, screen, waitFor } from '@testing-library/react'
import { clearLocalStorage, setInLocalStorage } from 'tldraw'
import { vi } from 'vitest'
import {
	ACKNOWLEDGEMENT_EXPIRY_MS,
	CHECK_INTERVAL_MS,
	LOCAL_STORAGE_KEY_FILESIZE,
	LOCAL_STORAGE_KEY_SESSION,
	MAX_SESSION_TIME_MS,
} from './constants'
import { LocalFileHandler } from './LocalFileHandler'

const addDialogMock = vi.fn()

function createMockEditor(
	overrides: {
		shapeCount?: number
		assetFileSizeSum?: number
		maxShapesPerPage?: number
	} = {}
) {
	const { shapeCount = 0, assetFileSizeSum = 0, maxShapesPerPage = 1000 } = overrides
	const page = { id: 'page:page1' }
	return {
		getPages: () => [page],
		getPageShapeIds: () =>
			new Set(
				Array(shapeCount)
					.fill(0)
					.map((_, i) => `shape:${i}`)
			),
		getAssets: () =>
			assetFileSizeSum > 0 ? [{ type: 'image', props: { fileSize: assetFileSizeSum } }] : [],
		options: { maxShapesPerPage },
	}
}

let mockEditor = createMockEditor()

vi.mock('./dialogs', () => ({
	LargeFileDialog: () => null,
	SessionTimeDialog: () => null,
}))

vi.mock('tldraw', async () => {
	/* eslint-disable  no-restricted-syntax */
	const React = await vi.importActual('react')
	return {
		...React,
		useEditor: () => mockEditor,
		useDialogs: () => ({ addDialog: addDialogMock }),
		useOnMount: (fn: () => void | (() => void)) => {
			/* eslint-disable react-hooks/exhaustive-deps */
			const { useEffect } = React as {
				useEffect(fn: () => void | (() => void), deps?: any[]): void
			}
			useEffect(() => {
				const teardown = fn()
				return teardown ?? undefined
			}, [])
		},
		clearLocalStorage: () => localStorage.clear(),
		getFromLocalStorage: (key: string) => localStorage.getItem(key),
		setInLocalStorage: (key: string, value: string) => {
			localStorage.setItem(key, value)
		},
		DEFAULT_MAX_ASSET_SIZE: 10 * 1024 * 1024,
	}
})

describe('LocalFileHandler', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		clearLocalStorage()
		addDialogMock.mockClear()
		mockEditor = createMockEditor()
	})

	it('renders without crashing', () => {
		render(<LocalFileHandler />)
		expect(document.body).toBeTruthy()
	})

	it('renders nothing when under thresholds', async () => {
		render(<LocalFileHandler />)

		await waitFor(() => {
			expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()
			expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()
		})
	})

	it('shows large-file indicator when shape count exceeds 0.9 * maxShapesPerPage', async () => {
		mockEditor = createMockEditor({
			shapeCount: 91,
			maxShapesPerPage: 100,
		})

		render(<LocalFileHandler />)

		await waitFor(() => {
			expect(screen.queryByTestId('tldraw-large-file-indicator')).not.toBeNull()
			expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()
		})
	})

	it('shows large-file indicator when total asset size exceeds DEFAULT_MAX_ASSET_SIZE', async () => {
		const overLimit = 11 * 1024 * 1024
		mockEditor = createMockEditor({
			shapeCount: 0,
			assetFileSizeSum: overLimit,
		})

		render(<LocalFileHandler />)

		await waitFor(() => {
			expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()
			expect(screen.queryByTestId('tldraw-large-file-indicator')).not.toBeNull()
		})
	})

	it('clicking large-file indicator calls addDialog', async () => {
		mockEditor = createMockEditor({
			shapeCount: 901,
			maxShapesPerPage: 1000,
		})

		render(<LocalFileHandler />)

		await waitFor(() => {
			expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()
			expect(screen.queryByTestId('tldraw-large-file-indicator')).not.toBeNull()
		})

		await act(async () => {
			screen.getByTestId('tldraw-large-file-indicator').click()
		})

		expect(addDialogMock).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'large-file-warning',
			})
		)
	})

	it('shows session-time indicator when session is long and session acknowledgement expired', async () => {
		vi.useFakeTimers()
		mockEditor = createMockEditor({ shapeCount: 0 })

		act(() => {
			render(<LocalFileHandler />)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()
		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		act(() => {
			vi.advanceTimersByTime(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()
		expect(screen.queryByTestId('tldraw-session-time-indicator')).not.toBeNull()

		vi.useRealTimers()
	})

	it('clicking session-time indicator calls addDialog', async () => {
		vi.useFakeTimers()
		mockEditor = createMockEditor({ shapeCount: 0 })

		act(() => {
			render(<LocalFileHandler />)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()
		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		act(() => {
			vi.advanceTimersByTime(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)
		})

		screen.getByTestId('tldraw-session-time-indicator').click()

		expect(addDialogMock).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'session-time-warning',
			})
		)

		vi.useRealTimers()
	})

	it('after acknowledging file size, large-file indicator can disappear', async () => {
		vi.useFakeTimers()
		mockEditor = createMockEditor({
			shapeCount: 901,
			maxShapesPerPage: 1000,
		})

		act(() => {
			render(<LocalFileHandler />)
		})

		expect(screen.getByTestId('tldraw-large-file-indicator')).toBeDefined()

		setInLocalStorage(LOCAL_STORAGE_KEY_FILESIZE, Date.now().toString())

		act(() => {
			vi.advanceTimersByTime(CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()

		vi.useRealTimers()
	})

	it('after acknowledging session time, session-time indicator disappears', () => {
		vi.useFakeTimers()
		mockEditor = createMockEditor({ shapeCount: 0 })

		act(() => {
			render(<LocalFileHandler />)
		})

		act(() => {
			vi.advanceTimersByTime(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)
		})

		expect(screen.getByTestId('tldraw-session-time-indicator')).toBeDefined()

		setInLocalStorage(LOCAL_STORAGE_KEY_SESSION, Date.now().toString())

		act(() => {
			vi.advanceTimersByTime(CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		vi.useRealTimers()
	})

	it('large file takes priority over long session', () => {
		vi.useFakeTimers()
		mockEditor = createMockEditor({
			shapeCount: 901,
			maxShapesPerPage: 1000,
		})

		act(() => {
			render(<LocalFileHandler />)
		})

		act(() => {
			vi.advanceTimersByTime(MAX_SESSION_TIME_MS + CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).not.toBeNull()
		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		vi.useRealTimers()
	})

	it('does not show large-file indicator if recently acknowledged', () => {
		vi.useFakeTimers()
		setInLocalStorage(LOCAL_STORAGE_KEY_FILESIZE, Date.now().toString())
		mockEditor = createMockEditor({
			shapeCount: 901,
			maxShapesPerPage: 1000,
		})

		act(() => {
			render(<LocalFileHandler />)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()
		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		vi.useRealTimers()
	})

	it('does not show session-time indicator if recently acknowledged', () => {
		vi.useFakeTimers()
		setInLocalStorage(LOCAL_STORAGE_KEY_SESSION, Date.now().toString())
		mockEditor = createMockEditor({ shapeCount: 0 })

		act(() => {
			render(<LocalFileHandler />)
		})

		act(() => {
			vi.advanceTimersByTime(CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		vi.useRealTimers()
	})

	it('large-file indicator reappears after acknowledgement expires', () => {
		vi.useFakeTimers()
		setInLocalStorage(LOCAL_STORAGE_KEY_FILESIZE, Date.now().toString())
		mockEditor = createMockEditor({
			shapeCount: 901,
			maxShapesPerPage: 1000,
		})

		act(() => {
			render(<LocalFileHandler />)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).toBeNull()

		act(() => {
			vi.advanceTimersByTime(ACKNOWLEDGEMENT_EXPIRY_MS + CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-large-file-indicator')).not.toBeNull()

		vi.useRealTimers()
	})

	it('session-time indicator reappears after acknowledgement expires', () => {
		vi.useFakeTimers()
		setInLocalStorage(LOCAL_STORAGE_KEY_SESSION, Date.now().toString())
		mockEditor = createMockEditor({ shapeCount: 0 })

		act(() => {
			render(<LocalFileHandler />)
		})

		expect(screen.queryByTestId('tldraw-session-time-indicator')).toBeNull()

		act(() => {
			vi.advanceTimersByTime(ACKNOWLEDGEMENT_EXPIRY_MS + CHECK_INTERVAL_MS + 1)
		})

		expect(screen.queryByTestId('tldraw-session-time-indicator')).not.toBeNull()

		vi.useRealTimers()
	})

	it('cleans up interval on unmount', () => {
		vi.useFakeTimers()
		const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
		mockEditor = createMockEditor({ shapeCount: 0 })

		let unmount: () => void
		act(() => {
			const result = render(<LocalFileHandler />)
			unmount = result.unmount
		})

		act(() => {
			unmount()
		})

		expect(clearIntervalSpy).toHaveBeenCalled()

		clearIntervalSpy.mockRestore()
		vi.useRealTimers()
	})
})
