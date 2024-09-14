import { SerializedSchemaV1, upgradeSchema } from '../StoreSchema'

describe('upgradeSchema', () => {
	it('should upgrade a schema from v1 to v2, assuming its working with tldraw data', () => {
		const v1: SerializedSchemaV1 = {
			schemaVersion: 1,
			storeVersion: 4,
			recordVersions: {
				asset: {
					version: 1,
					subTypeKey: 'type',
					subTypeVersions: { image: 2, video: 2, bookmark: 0 },
				},
				camera: { version: 1 },
				document: { version: 2 },
				instance: { version: 22 },
				instance_page_state: { version: 5 },
				page: { version: 1 },
				shape: {
					version: 3,
					subTypeKey: 'type',
					subTypeVersions: {
						group: 0,
						text: 1,
						bookmark: 1,
						draw: 1,
						geo: 7,
						note: 4,
						line: 1,
						frame: 0,
						arrow: 1,
						highlight: 0,
						embed: 4,
						image: 2,
						video: 1,
					},
				},
				instance_presence: { version: 5 },
				pointer: { version: 1 },
			},
		}

		expect(upgradeSchema(v1)).toMatchInlineSnapshot(`
		{
		  "ok": true,
		  "value": {
		    "schemaVersion": 2,
		    "sequences": {
		      "com.tldraw.asset": 1,
		      "com.tldraw.asset.bookmark": 0,
		      "com.tldraw.asset.image": 2,
		      "com.tldraw.asset.video": 2,
		      "com.tldraw.camera": 1,
		      "com.tldraw.document": 2,
		      "com.tldraw.instance": 22,
		      "com.tldraw.instance_page_state": 5,
		      "com.tldraw.instance_presence": 5,
		      "com.tldraw.page": 1,
		      "com.tldraw.pointer": 1,
		      "com.tldraw.shape": 3,
		      "com.tldraw.shape.arrow": 1,
		      "com.tldraw.shape.bookmark": 1,
		      "com.tldraw.shape.draw": 1,
		      "com.tldraw.shape.embed": 4,
		      "com.tldraw.shape.frame": 0,
		      "com.tldraw.shape.geo": 7,
		      "com.tldraw.shape.group": 0,
		      "com.tldraw.shape.highlight": 0,
		      "com.tldraw.shape.image": 2,
		      "com.tldraw.shape.line": 1,
		      "com.tldraw.shape.note": 4,
		      "com.tldraw.shape.text": 1,
		      "com.tldraw.shape.video": 1,
		      "com.tldraw.store": 4,
		    },
		  },
		}
	`)
	})
})
