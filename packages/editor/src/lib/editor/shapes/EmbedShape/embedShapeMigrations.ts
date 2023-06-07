import { defineMigrations } from '@tldraw/store'
import { EMBED_DEFINITIONS, TLEmbedDefinition } from './embedShapeTypes'

const Versions = {
	GenOriginalUrlInEmbed: 1,
} as const

/** @internal */
export const embedShapeMigrations = defineMigrations({
	currentVersion: Versions.GenOriginalUrlInEmbed,
	migrators: {
		[Versions.GenOriginalUrlInEmbed]: {
			// add tmpOldUrl property
			up: (shape) => {
				const url = shape.props.url
				const host = new URL(url).host.replace('www.', '')
				let originalUrl
				for (const localEmbedDef of EMBED_DEFINITIONS) {
					if ((localEmbedDef as TLEmbedDefinition).hostnames.includes(host)) {
						try {
							originalUrl = localEmbedDef.fromEmbedUrl(url)
						} catch (err) {
							console.warn(err)
						}
					}
				}

				return {
					...shape,
					props: {
						...shape.props,
						tmpOldUrl: shape.props.url,
						url: originalUrl ?? '',
					},
				}
			},
			// remove tmpOldUrl property
			down: (shape) => {
				let newUrl = shape.props.tmpOldUrl
				if (!newUrl || newUrl === '') {
					const url = shape.props.url
					const host = new URL(url).host.replace('www.', '')

					for (const localEmbedDef of EMBED_DEFINITIONS) {
						if ((localEmbedDef as TLEmbedDefinition).hostnames.includes(host)) {
							try {
								newUrl = localEmbedDef.toEmbedUrl(url)
							} catch (err) {
								console.warn(err)
							}
						}
					}
				}

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { tmpOldUrl, ...props } = shape.props
				return {
					...shape,
					props: {
						...props,
						url: newUrl ?? '',
					},
				}
			},
		},
	},
})
