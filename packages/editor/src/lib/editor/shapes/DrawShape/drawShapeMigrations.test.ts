import { drawShapeMigrations } from './drawShapeMigrations'

describe('Adding isPen prop', () => {
	const { up, down } = drawShapeMigrations.migrators[1]

	test('up works as expected with a shape that is not a pen shape', () => {
		expect(
			up({
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 1, y: 1, z: 0.5 },
							],
						},
					],
				},
			})
		).toEqual({
			props: {
				isPen: false,
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 1, y: 1, z: 0.5 },
						],
					},
				],
			},
		})
	})

	test('up works as expected when converting to pen', () => {
		expect(
			up({
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.2315 },
								{ x: 1, y: 1, z: 0.2421 },
							],
						},
					],
				},
			})
		).toEqual({
			props: {
				isPen: true,
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.2315 },
							{ x: 1, y: 1, z: 0.2421 },
						],
					},
				],
			},
		})
	})

	test('down works as expected', () => {
		expect(down({ props: { isPen: false } })).toEqual({
			props: {},
		})
	})
})
