// A copy of OpsBatchSchema in apps/dotcom/client/src/tla/utils/canvas-ops/schema.ts, as JSON schema. The
// worker can't import that without bundling zod. canvas-ops/schema.test.ts fails when the two disagree;
// run it with UPDATE_CANVAS_OPS_SCHEMA=1 to rewrite this file, then format it.
export const CANVAS_OPS_BATCH_JSON_SCHEMA = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	type: 'object',
	properties: {
		ops: {
			maxItems: 1000,
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'path' },
							id: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9:_-]+$' },
							points: {
								minItems: 2,
								maxItems: 256,
								type: 'array',
								items: {
									type: 'object',
									properties: {
										x: { type: 'number', minimum: -1000000, maximum: 1000000 },
										y: { type: 'number', minimum: -1000000, maximum: 1000000 },
									},
									required: ['x', 'y'],
									additionalProperties: false,
								},
							},
							closed: { type: 'boolean' },
							smooth: { type: 'boolean' },
							color: {
								type: 'string',
								enum: [
									'black',
									'grey',
									'light-violet',
									'violet',
									'blue',
									'light-blue',
									'yellow',
									'orange',
									'green',
									'light-green',
									'light-red',
									'red',
									'white',
								],
							},
							fill: { type: 'string', enum: ['none', 'semi', 'solid', 'pattern', 'fill'] },
							dash: { type: 'string', enum: ['draw', 'solid', 'dashed', 'dotted'] },
							size: { type: 'string', enum: ['s', 'm', 'l', 'xl'] },
						},
						required: ['op', 'points'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'duplicate' },
							subject: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
							id: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9:_-]+$' },
							at: {
								type: 'object',
								properties: {
									x: { type: 'number', minimum: -1000000, maximum: 1000000 },
									y: { type: 'number', minimum: -1000000, maximum: 1000000 },
								},
								required: ['x', 'y'],
								additionalProperties: false,
							},
							text: { type: 'string', maxLength: 5000 },
						},
						required: ['op', 'subject', 'at'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'add' },
							kind: { type: 'string', enum: ['label', 'note', 'box', 'ellipse', 'shape'] },
							text: { type: 'string', maxLength: 5000 },
							id: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9:_-]+$' },
							geo: {
								type: 'string',
								enum: [
									'rectangle',
									'ellipse',
									'triangle',
									'diamond',
									'hexagon',
									'star',
									'cloud',
									'heart',
									'arrow-right',
									'arrow-left',
									'arrow-up',
									'arrow-down',
									'x-box',
									'check-box',
								],
							},
							w: { type: 'number', exclusiveMinimum: 0, maximum: 100000 },
							h: { type: 'number', exclusiveMinimum: 0, maximum: 100000 },
							color: {
								type: 'string',
								enum: [
									'black',
									'grey',
									'light-violet',
									'violet',
									'blue',
									'light-blue',
									'yellow',
									'orange',
									'green',
									'light-green',
									'light-red',
									'red',
									'white',
								],
							},
							fill: { type: 'string', enum: ['none', 'semi', 'solid', 'pattern', 'fill'] },
							dash: { type: 'string', enum: ['draw', 'solid', 'dashed', 'dotted'] },
							size: { type: 'string', enum: ['s', 'm', 'l', 'xl'] },
							relation: {
								type: 'string',
								enum: ['above', 'below', 'left_of', 'right_of', 'inside', 'centered_on'],
							},
							target: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
							at: {
								type: 'object',
								properties: {
									x: { type: 'number', minimum: -1000000, maximum: 1000000 },
									y: { type: 'number', minimum: -1000000, maximum: 1000000 },
								},
								required: ['x', 'y'],
								additionalProperties: false,
							},
							gap: { type: 'number', minimum: 0, maximum: 10000 },
							align: { type: 'string', enum: ['start', 'center', 'end'] },
						},
						required: ['op'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'place' },
							subject: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
							relation: {
								type: 'string',
								enum: ['above', 'below', 'left_of', 'right_of', 'inside', 'centered_on'],
							},
							target: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
							at: {
								type: 'object',
								properties: {
									x: { type: 'number', minimum: -1000000, maximum: 1000000 },
									y: { type: 'number', minimum: -1000000, maximum: 1000000 },
								},
								required: ['x', 'y'],
								additionalProperties: false,
							},
							gap: { type: 'number', minimum: 0, maximum: 10000 },
							align: { type: 'string', enum: ['start', 'center', 'end'] },
							w: { type: 'number', exclusiveMinimum: 0, maximum: 100000 },
							h: { type: 'number', exclusiveMinimum: 0, maximum: 100000 },
							text: { type: 'string', maxLength: 5000 },
							color: {
								type: 'string',
								enum: [
									'black',
									'grey',
									'light-violet',
									'violet',
									'blue',
									'light-blue',
									'yellow',
									'orange',
									'green',
									'light-green',
									'light-red',
									'red',
									'white',
								],
							},
							fill: { type: 'string', enum: ['none', 'semi', 'solid', 'pattern', 'fill'] },
							dash: { type: 'string', enum: ['draw', 'solid', 'dashed', 'dotted'] },
							size: { type: 'string', enum: ['s', 'm', 'l', 'xl'] },
						},
						required: ['op', 'subject'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'label' },
							target: {
								anyOf: [
									{
										anyOf: [
											{ type: 'string', minLength: 1, maxLength: 200 },
											{
												type: 'object',
												properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
												required: ['text'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: { selected: { type: 'boolean', const: true } },
												required: ['selected'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: {
													created: {
														anyOf: [
															{ type: 'string', const: 'last' },
															{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
														],
													},
												},
												required: ['created'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: {
													description: { type: 'string', minLength: 1, maxLength: 200 },
												},
												required: ['description'],
												additionalProperties: false,
											},
										],
									},
									{
										type: 'object',
										properties: {
											point: {
												type: 'object',
												properties: {
													x: { type: 'number', minimum: -1000000, maximum: 1000000 },
													y: { type: 'number', minimum: -1000000, maximum: 1000000 },
												},
												required: ['x', 'y'],
												additionalProperties: false,
											},
										},
										required: ['point'],
										additionalProperties: false,
									},
								],
							},
							text: { type: 'string', maxLength: 5000 },
							side: { type: 'string', enum: ['above', 'below', 'left', 'right', 'auto'] },
							arrow: { type: 'boolean' },
							gap: { type: 'number', minimum: 0, maximum: 10000 },
							color: {
								type: 'string',
								enum: [
									'black',
									'grey',
									'light-violet',
									'violet',
									'blue',
									'light-blue',
									'yellow',
									'orange',
									'green',
									'light-green',
									'light-red',
									'red',
									'white',
								],
							},
							size: { type: 'string', enum: ['s', 'm', 'l', 'xl'] },
							id: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9:_-]+$' },
						},
						required: ['op', 'target', 'text'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'connect' },
							from: {
								anyOf: [
									{
										anyOf: [
											{ type: 'string', minLength: 1, maxLength: 200 },
											{
												type: 'object',
												properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
												required: ['text'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: { selected: { type: 'boolean', const: true } },
												required: ['selected'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: {
													created: {
														anyOf: [
															{ type: 'string', const: 'last' },
															{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
														],
													},
												},
												required: ['created'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: {
													description: { type: 'string', minLength: 1, maxLength: 200 },
												},
												required: ['description'],
												additionalProperties: false,
											},
										],
									},
									{
										type: 'object',
										properties: {
											point: {
												type: 'object',
												properties: {
													x: { type: 'number', minimum: -1000000, maximum: 1000000 },
													y: { type: 'number', minimum: -1000000, maximum: 1000000 },
												},
												required: ['x', 'y'],
												additionalProperties: false,
											},
										},
										required: ['point'],
										additionalProperties: false,
									},
								],
							},
							to: {
								anyOf: [
									{
										anyOf: [
											{ type: 'string', minLength: 1, maxLength: 200 },
											{
												type: 'object',
												properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
												required: ['text'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: { selected: { type: 'boolean', const: true } },
												required: ['selected'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: {
													created: {
														anyOf: [
															{ type: 'string', const: 'last' },
															{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
														],
													},
												},
												required: ['created'],
												additionalProperties: false,
											},
											{
												type: 'object',
												properties: {
													description: { type: 'string', minLength: 1, maxLength: 200 },
												},
												required: ['description'],
												additionalProperties: false,
											},
										],
									},
									{
										type: 'object',
										properties: {
											point: {
												type: 'object',
												properties: {
													x: { type: 'number', minimum: -1000000, maximum: 1000000 },
													y: { type: 'number', minimum: -1000000, maximum: 1000000 },
												},
												required: ['x', 'y'],
												additionalProperties: false,
											},
										},
										required: ['point'],
										additionalProperties: false,
									},
								],
							},
							text: { type: 'string', maxLength: 5000 },
							color: {
								type: 'string',
								enum: [
									'black',
									'grey',
									'light-violet',
									'violet',
									'blue',
									'light-blue',
									'yellow',
									'orange',
									'green',
									'light-green',
									'light-red',
									'red',
									'white',
								],
							},
							dash: { type: 'string', enum: ['draw', 'solid', 'dashed', 'dotted'] },
							id: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[A-Za-z0-9:_-]+$' },
						},
						required: ['op', 'from', 'to'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'rename' },
							target: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
							text: { type: 'string', maxLength: 5000 },
							fit: { type: 'string', enum: ['widen', 'shrink_text'] },
						},
						required: ['op', 'target', 'text'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'restyle' },
							targets: {
								anyOf: [
									{
										minItems: 1,
										maxItems: 200,
										type: 'array',
										items: {
											anyOf: [
												{ type: 'string', minLength: 1, maxLength: 200 },
												{
													type: 'object',
													properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
													required: ['text'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: { selected: { type: 'boolean', const: true } },
													required: ['selected'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: {
														created: {
															anyOf: [
																{ type: 'string', const: 'last' },
																{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
															],
														},
													},
													required: ['created'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: {
														description: { type: 'string', minLength: 1, maxLength: 200 },
													},
													required: ['description'],
													additionalProperties: false,
												},
											],
										},
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { created: { type: 'string', const: 'all' } },
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
								],
							},
							color: {
								type: 'string',
								enum: [
									'black',
									'grey',
									'light-violet',
									'violet',
									'blue',
									'light-blue',
									'yellow',
									'orange',
									'green',
									'light-green',
									'light-red',
									'red',
									'white',
								],
							},
							fill: { type: 'string', enum: ['none', 'semi', 'solid', 'pattern', 'fill'] },
							dash: { type: 'string', enum: ['draw', 'solid', 'dashed', 'dotted'] },
							size: { type: 'string', enum: ['s', 'm', 'l', 'xl'] },
							like: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
						},
						required: ['op', 'targets'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'remove' },
							targets: {
								anyOf: [
									{
										minItems: 1,
										maxItems: 200,
										type: 'array',
										items: {
											anyOf: [
												{ type: 'string', minLength: 1, maxLength: 200 },
												{
													type: 'object',
													properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
													required: ['text'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: { selected: { type: 'boolean', const: true } },
													required: ['selected'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: {
														created: {
															anyOf: [
																{ type: 'string', const: 'last' },
																{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
															],
														},
													},
													required: ['created'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: {
														description: { type: 'string', minLength: 1, maxLength: 200 },
													},
													required: ['description'],
													additionalProperties: false,
												},
											],
										},
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { created: { type: 'string', const: 'all' } },
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
								],
							},
						},
						required: ['op', 'targets'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'untangle' },
							targets: {
								anyOf: [
									{
										minItems: 1,
										maxItems: 200,
										type: 'array',
										items: {
											anyOf: [
												{ type: 'string', minLength: 1, maxLength: 200 },
												{
													type: 'object',
													properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
													required: ['text'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: { selected: { type: 'boolean', const: true } },
													required: ['selected'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: {
														created: {
															anyOf: [
																{ type: 'string', const: 'last' },
																{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
															],
														},
													},
													required: ['created'],
													additionalProperties: false,
												},
												{
													type: 'object',
													properties: {
														description: { type: 'string', minLength: 1, maxLength: 200 },
													},
													required: ['description'],
													additionalProperties: false,
												},
											],
										},
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { created: { type: 'string', const: 'all' } },
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
								],
							},
							keepNear: {
								maxItems: 200,
								type: 'array',
								items: {
									anyOf: [
										{ type: 'string', minLength: 1, maxLength: 200 },
										{
											type: 'object',
											properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
											required: ['text'],
											additionalProperties: false,
										},
										{
											type: 'object',
											properties: { selected: { type: 'boolean', const: true } },
											required: ['selected'],
											additionalProperties: false,
										},
										{
											type: 'object',
											properties: {
												created: {
													anyOf: [
														{ type: 'string', const: 'last' },
														{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
													],
												},
											},
											required: ['created'],
											additionalProperties: false,
										},
										{
											type: 'object',
											properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
											required: ['description'],
											additionalProperties: false,
										},
									],
								},
							},
							maxDistance: { type: 'number', exclusiveMinimum: 0, maximum: 2000 },
						},
						required: ['op', 'targets'],
						additionalProperties: false,
					},
					{
						type: 'object',
						properties: {
							op: { type: 'string', const: 'resize' },
							target: {
								anyOf: [
									{ type: 'string', minLength: 1, maxLength: 200 },
									{
										type: 'object',
										properties: { text: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['text'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { selected: { type: 'boolean', const: true } },
										required: ['selected'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: {
											created: {
												anyOf: [
													{ type: 'string', const: 'last' },
													{ type: 'integer', minimum: 0, maximum: 9007199254740991 },
												],
											},
										},
										required: ['created'],
										additionalProperties: false,
									},
									{
										type: 'object',
										properties: { description: { type: 'string', minLength: 1, maxLength: 200 } },
										required: ['description'],
										additionalProperties: false,
									},
								],
							},
							w: { type: 'number', exclusiveMinimum: 0, maximum: 100000 },
							h: { type: 'number', exclusiveMinimum: 0, maximum: 100000 },
							scale: { type: 'number', exclusiveMinimum: 0, maximum: 100 },
							anchor: { type: 'string', enum: ['top-left', 'center'] },
						},
						required: ['op', 'target'],
						additionalProperties: false,
					},
				],
			},
		},
	},
	required: ['ops'],
	additionalProperties: false,
} as const
