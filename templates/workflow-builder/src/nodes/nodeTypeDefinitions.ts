import { NodeType } from './nodeTypes.tsx'

export interface NodeInfo {
	type: NodeType['type']
	title: string
	icon: string
	getDefault: () => NodeType
}

export const nodeTypes: NodeInfo[] = [
	{
		type: 'add',
		title: 'Add',
		icon: '+',
		getDefault: () => ({ type: 'add', items: [0, 0] }),
	},
	{
		type: 'subtract',
		title: 'Subtract',
		icon: '−',
		getDefault: () => ({ type: 'subtract', a: 0, b: 0 }),
	},
	{
		type: 'multiply',
		title: 'Multiply',
		icon: '×',
		getDefault: () => ({ type: 'multiply', a: 0, b: 0 }),
	},
	{
		type: 'divide',
		title: 'Divide',
		icon: '÷',
		getDefault: () => ({ type: 'divide', a: 0, b: 0 }),
	},
]
