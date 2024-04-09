import { LoaderFunctionArgs, useLoaderData } from 'react-router-dom'

export function defineLoader<T>(_loader: (args: LoaderFunctionArgs) => Promise<T>): {
	loader: (args: LoaderFunctionArgs) => Promise<{ [specialSymbol]: T }>
	useData: () => Exclude<T, Response>
} {
	const specialSymbol = Symbol('loader')
	const loader = async (params: any) => {
		const result = await _loader(params)
		if (result instanceof Response) {
			return result
		}
		return {
			[specialSymbol]: result,
		} as any
	}

	return {
		loader,
		useData() {
			const raw = useLoaderData()
			if (typeof raw === 'object' && raw && specialSymbol in raw) return raw[specialSymbol] as any
			throw new Error('Loader data not found')
		},
	}
}
