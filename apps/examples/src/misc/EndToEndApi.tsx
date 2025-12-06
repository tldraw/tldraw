import { TLExportType, TLRichText, TLShapeId } from 'tldraw'

export interface EndToEndApi {
	exportAsSvg(): void
	exportAsFormat(format: TLExportType): void
	createShapeId(): TLShapeId
	toRichText(text: string): TLRichText
	markAllArrowBindings(): void
}
