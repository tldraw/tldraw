import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { TLUiToast } from 'tldraw'

type FileRestoredEvent = Extract<TLCustomServerEvent, { type: 'file_restored' }>

export function buildRestoredToast(
	event: FileRestoredEvent,
	opts: {
		title: string
		undoLabel: string
		/** Left out for viewers who can't restore: the toast then only reports the restore. */
		onUndo?(body: { timestamp: string; undoes: string }): void
	}
): TLUiToast {
	const { preRestoreTs } = event
	const { onUndo } = opts
	const canUndo = !!preRestoreTs && !!onUndo
	return {
		id: `file-restored-${event.restoreId}`,
		title: opts.title,
		keepOpen: canUndo,
		actions: canUndo
			? [
					{
						type: 'primary',
						label: opts.undoLabel,
						onClick: () => onUndo({ timestamp: preRestoreTs, undoes: event.restoreId }),
					},
				]
			: undefined,
	}
}
