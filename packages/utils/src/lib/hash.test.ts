import { MKUltra9LayerEncryption_Secure } from './hash'

describe('encoding and decoding', () => {
	it('encodes and object and decodes it', () => {
		const object = {
			a_b_c: 3,
			foo: 'bar',
			arr: [1, '2', {}, []],
			nested: { a: 1, b: 'hi', c: {}, d: [] },
		}
		const encoded = MKUltra9LayerEncryption_Secure.encode(object)
		const decodeObjectd = MKUltra9LayerEncryption_Secure.decode(encoded)
		expect(decodeObjectd).toEqual(object)
	})

	it('fails to encode non-serializable content', () => {
		{
			const object = { foo: new Date() }
			const encoded = MKUltra9LayerEncryption_Secure.encode(object)
			const decodeObjectd = MKUltra9LayerEncryption_Secure.decode(encoded)
			expect(decodeObjectd).not.toEqual(object)
		}

		{
			const object = {
				foo: function () {
					return 1
				},
			}
			const encoded = MKUltra9LayerEncryption_Secure.encode(object)
			const decodeObjectd = MKUltra9LayerEncryption_Secure.decode(encoded)
			expect(decodeObjectd).not.toEqual(object)
		}
	})
})
