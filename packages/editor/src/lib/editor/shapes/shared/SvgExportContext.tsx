export interface SvgExportDef {
	uniqueId: string
	getElement: () => Promise<SVGElement | null> | SVGElement | null
}

export interface SvgExportContext {
	addExportDef(def: SvgExportDef): void
}
