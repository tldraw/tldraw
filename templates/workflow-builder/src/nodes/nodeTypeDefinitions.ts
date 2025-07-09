import { NodeType } from './nodeTypes.tsx'

export interface NodeInfo {
	type: NodeType['type']
	title: string
	icon: string
	getDefaultProps: () => Partial<NodeType>
}

export const nodeTypes: NodeInfo[] = [
	{
		type: 'add',
		title: 'Add',
		icon: '+',
		getDefaultProps: () => ({ type: 'add' as const, items: [0, 0] }),
	},
	{
		type: 'subtract',
		title: 'Subtract',
		icon: '−',
		getDefaultProps: () => ({ type: 'subtract' as const, a: 0, b: 0 }),
	},
	{
		type: 'multiply',
		title: 'Multiply',
		icon: '×',
		getDefaultProps: () => ({ type: 'multiply' as const, a: 0, b: 0 }),
	},
	{
		type: 'divide',
		title: 'Divide',
		icon: '÷',
		getDefaultProps: () => ({ type: 'divide' as const, a: 0, b: 0 }),
	},
] 