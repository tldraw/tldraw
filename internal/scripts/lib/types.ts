import { T } from '@tldraw/validate'

export const EXPORT_CONFIG_KEY = 'tldraw_template' as const

export const TemplateConfig = T.object({
	repo: T.string,
	cli: T.object({
		name: T.string,
		description: T.string,
		shortDescription: T.string.optional(),
		order: T.number.optional(),
	}).optional(),
	scripts: T.dict(T.string, T.nullable(T.string)).optional(),
})
export type TemplateConfig = T.TypeOf<typeof TemplateConfig>

export const PackageJson = T.object({
	name: T.string,
	private: T.boolean.optional(),
	workspaces: T.arrayOf(T.string).optional(),
	[EXPORT_CONFIG_KEY]: TemplateConfig.optional(),
	scripts: T.dict(T.string, T.nullable(T.string)).optional(),
	dependencies: T.dict(T.string, T.string).optional(),
	devDependencies: T.dict(T.string, T.string).optional(),
	peerDependencies: T.dict(T.string, T.string).optional(),
}).allowUnknownProperties()
export type PackageJson = T.TypeOf<typeof PackageJson>

export const TsConfigJson = T.object({
	references: T.arrayOf(
		T.object({
			path: T.string,
		})
	).optional(),
}).allowUnknownProperties()
export type TsConfigJson = T.TypeOf<typeof TsConfigJson>
