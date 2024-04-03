import { TLExportType } from 'tldraw/src/lib/utils/export/exportAs'

export interface EndToEndApi {
	exportAsSvg: () => void
	exportAsFormat: (format: TLExportType) => void
}
