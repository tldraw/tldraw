import { TLCustomServerEvent } from '@tldraw/dotcom-shared'
import { TLUiToast } from 'tldraw'

type FileRestoredEvent = Extract<TLCustomServerEvent, { type: 'file_restored' }>

export function buildRestoredToast(
	event: FileRestoredEvent,
	opts: {
		title: string
		undoLabel: string
		onUndo(body: { timestamp: string; undoes: string }): void
	}
): TLUiToast {
	const { preRestoreTs } = event
	return {
		id: `file-restored-${event.restoreId}`,
		title: opts.title,
		keepOpen: !!preRestoreTs,
		actions: preRestoreTs
			? [
					{
						type: 'primary',
						label: opts.undoLabel,
						onClick: () => opts.onUndo({ timestamp: preRestoreTs, undoes: event.restoreId }),
					},
				]
			: undefined,
	}
}
