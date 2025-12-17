import { TLExportType, TLRichText, TLShapeId, b64Vecs } from 'tldraw'

export interface EndToEndApi {
	exportAsSvg(): void
	exportAsFormat(format: TLExportType): void
	createShapeId(): TLShapeId
	toRichText(text: string): TLRichText
	markAllArrowBindings(): void
	b64Vecs: typeof b64Vecs
}
