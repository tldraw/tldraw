import { showInsertDiskDialog } from './DesktopDialog'
import { FloppyIcon } from './FloppyIcon'

const FLOPPY_LABEL = 'Insert disk'

// A classic floppy disk pinned to the top-right corner of the desktop.
// Sits on its own DOM layer above the canvas; clicking opens the
// "Insert disk" demo dialog.
export function DesktopFloppy() {
	return (
		<button
			type="button"
			className="desktop-floppy hoverable"
			onClick={showInsertDiskDialog}
			aria-label={FLOPPY_LABEL}
			title={FLOPPY_LABEL}
		>
			<FloppyIcon className="desktop-floppy__icon" />
			<span className="desktop-floppy__label">{FLOPPY_LABEL}</span>
		</button>
	)
}
