import { TLExportType, TLRichText, TLShapeId, VecModel } from 'tldraw'

export interface EndToEndApi {
	exportAsSvg(): void
	exportAsFormat(format: TLExportType): void
	createShapeId(): TLShapeId
	resetMockShapeIds(): void
	createMermaidDiagram(definition: string): Promise<void>
	toRichText(text: string): TLRichText
	preloadFonts(): Promise<void>
	markAllArrowBindings(): void
	b64VecsEncodePoints(points: VecModel[]): string
}
