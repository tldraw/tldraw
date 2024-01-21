import { applyObjectDiff, diffRecord } from '../lib/diff'

describe('nested arrays', () => {
	it('should be patchable at the end', () => {
		const a = {
			arr: [
				[1, 2, 3],
				[4, 5, 6],
			],
		}
		const b = {
			arr: [
				[1, 2, 3],
				[4, 5, 6, 7, 8],
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		Object {
		  "arr": Array [
		    "patch",
		    Object {
		      "1": Array [
		        "append",
		        Array [
		          7,
		          8,
		        ],
		        3,
		      ],
		    },
		  ],
		}
	`)
	})

	it('should be patchable at the beginning', () => {
		const a = {
			arr: [
				[1, 2, 3],
				[4, 5, 6],
			],
		}
		const b = {
			arr: [
				[1, 2, 3, 4, 5, 6],
				[4, 5, 6],
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		Object {
		  "arr": Array [
		    "patch",
		    Object {
		      "0": Array [
		        "append",
		        Array [
		          4,
		          5,
		          6,
		        ],
		        3,
		      ],
		    },
		  ],
		}
	`)
	})
})

describe('objects inside arrays', () => {
	it('should be patchable if only item changes', () => {
		const a = {
			arr: [
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			],
		}
		const b = {
			arr: [
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 7 },
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		      Object {
		        "arr": Array [
		          "patch",
		          Object {
		            "1": Array [
		              "patch",
		              Object {
		                "c": Array [
		                  "put",
		                  7,
		                ],
		              },
		            ],
		          },
		        ],
		      }
	    `)
	})

	it('should return a put op if many items change', () => {
		const a = {
			arr: [
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			],
		}
		const b = {
			arr: [
				{ a: 1, b: 2, c: 5 },
				{ a: 4, b: 5, c: 7 },
			],
		}

		expect(diffRecord(a, b)).toMatchInlineSnapshot(`
		Object {
		  "arr": Array [
		    "put",
		    Array [
		      Object {
		        "a": 1,
		        "b": 2,
		        "c": 5,
		      },
		      Object {
		        "a": 4,
		        "b": 5,
		        "c": 7,
		      },
		    ],
		  ],
		}
	`)
	})
})

test('deleting things from a record', () => {
	const a = {
		a: 1,
		b: 2,
		c: 3,
	}
	const b = {
		a: 1,
		b: 2,
	}

	const patch = diffRecord(a, b)
	expect(patch).toMatchInlineSnapshot(`
		Object {
		  "c": Array [
		    "delete",
		  ],
		}
	`)

	expect(applyObjectDiff(a, patch!)).toEqual(b)
})

test('adding things things to a record', () => {
	const a = {
		a: 1,
		b: 2,
	}
	const b = {
		a: 1,
		b: 2,
		c: 3,
	}

	const patch = diffRecord(a, b)

	expect(patch).toMatchInlineSnapshot(`
		Object {
		  "c": Array [
		    "put",
		    3,
		  ],
		}
	`)

	expect(applyObjectDiff(a, patch!)).toEqual(b)
})
