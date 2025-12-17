import { TLExportType, TLRichText, TLShapeId, VecModel } from 'tldraw'

export interface EndToEndApi {
	exportAsSvg(): void
	exportAsFormat(format: TLExportType): void
	createShapeId(): TLShapeId
	toRichText(text: string): TLRichText
	markAllArrowBindings(): void
	b64VecsEncodePoints(points: VecModel[]): string
}
