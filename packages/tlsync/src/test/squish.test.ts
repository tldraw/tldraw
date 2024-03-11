import { squishDataEvents } from '../lib/squish'

test('basic squishing', () => {
	const capture = [
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 929.58203125,
								h: 500.14453125,
							},
						],
					},
				],
			},
			serverClock: 9237,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679590],
						cursor: [
							'put',
							{
								x: 1526.07421875,
								y: 565.66796875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9238,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 916.046875,
								h: 494.20703125,
							},
						],
					},
				],
			},
			serverClock: 9239,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679599],
						cursor: [
							'put',
							{
								x: 1519.26171875,
								y: 563.71875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9240,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 909.234375,
								h: 492.2578125,
							},
						],
					},
				],
			},
			serverClock: 9241,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679608],
						cursor: [
							'put',
							{
								x: 1512.41015625,
								y: 562.23046875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9242,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 902.3828125,
								h: 490.76953125,
							},
						],
					},
				],
			},
			serverClock: 9243,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679617],
						cursor: [
							'put',
							{
								x: 1506.71484375,
								y: 561.29296875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9244,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 896.6875,
								h: 489.83203125,
							},
						],
					},
				],
			},
			serverClock: 9245,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679625],
						cursor: [
							'put',
							{
								x: 1501.734375,
								y: 560.88671875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9246,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 891.70703125,
								h: 489.42578125,
							},
						],
					},
				],
			},
			serverClock: 9247,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679633],
						cursor: [
							'put',
							{
								x: 1497.22265625,
								y: 560.6875,
								rotation: 0,
								type: 'default',
							},
						],
					},
				],
			},
			serverClock: 9248,
		},
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 887.1953125,
								h: 489.2265625,
							},
						],
					},
				],
			},
			serverClock: 9249,
		},
	]

	expect(squishDataEvents(capture as any)).toStrictEqual([
		{
			type: 'patch',
			diff: {
				'instance_presence:nlyxdltolNVL0VONRr9Bz': [
					'patch',
					{
						lastActivityTimestamp: ['put', 1710188679633],
						cursor: [
							'put',
							{
								x: 1497.22265625,
								y: 560.6875,
								rotation: 0,
								type: 'default',
							},
						],
						brush: [
							'put',
							{
								x: 610.02734375,
								y: 71.4609375,
								w: 887.1953125,
								h: 489.2265625,
							},
						],
					},
				],
			},
			serverClock: 9249,
		},
	])
})
