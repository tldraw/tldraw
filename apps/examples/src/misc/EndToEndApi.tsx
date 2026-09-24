import { TLExportType, TLRichText, TLShapeId, VecModel } from 'tldraw'
import type { MermaidReadabilityFinding } from './mermaidReadability'

export interface EndToEndApi {
	exportAsSvg(): void
	exportAsFormat(format: TLExportType): void
	createShapeId(): TLShapeId
	resetMockShapeIds(): void
	createMermaidDiagram(definition: string): Promise<void>
	checkMermaidReadability(definition: string): Promise<MermaidReadabilityFinding[]>
	toRichText(text: string): TLRichText
	preloadFonts(): Promise<void>
	markAllArrowBindings(): void
	b64VecsEncodePoints(points: VecModel[]): string
}
