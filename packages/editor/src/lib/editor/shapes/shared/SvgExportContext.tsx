export interface SvgExportDef {
	uniqueId: string
	getElement: () => Promise<SVGElement | SVGElement[] | null> | SVGElement | SVGElement[] | null
}

export interface SvgExportContext {
	addExportDef(def: SvgExportDef): void
}
