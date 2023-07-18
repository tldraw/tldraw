/** @public */
export interface SvgExportDef {
	key: string
	getElement: () => Promise<SVGElement | SVGElement[] | null> | SVGElement | SVGElement[] | null
}

/** @public */
export interface SvgExportContext {
	/**
	 * Add contents to the `<defs>` section of the export SVG. Each export def should have a unique
	 * key. If multiple defs come with the same key, only one will be added.
	 */
	addExportDef(def: SvgExportDef): void
}
