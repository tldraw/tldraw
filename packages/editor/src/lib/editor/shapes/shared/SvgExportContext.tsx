export interface SvgExportContext {
	addDefById(uniqueId: string, def: () => Promise<SVGElement> | SVGElement): void
}
