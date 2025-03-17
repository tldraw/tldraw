import getBabelOptions from 'recast/parsers/_babel_options'
import * as babel from 'recast/parsers/babel'

export const recastTypescriptParser = {
	parse: (source: string) => {
		const options = getBabelOptions()
		options.plugins.push('typescript')
		options.plugins.push('decoratorAutoAccessors')
		return babel.parser.parse(source, options)
	},
}
