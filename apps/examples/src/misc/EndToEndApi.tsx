import { TLExportType } from 'tldraw'

export interface EndToEndApi {
	exportAsSvg: () => void
	exportAsFormat: (format: TLExportType) => void
}
