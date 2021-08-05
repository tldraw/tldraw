'use strict';

/**
This regex represents a loose rule of an “image candidate string”.

@see https://html.spec.whatwg.org/multipage/images.html#srcset-attribute

An “image candidate string” roughly consists of the following:
1. Zero or more whitespace characters.
2. A non-empty URL that does not start or end with `,`.
3. Zero or more whitespace characters.
4. An optional “descriptor” that starts with a whitespace character.
5. Zero or more whitespace characters.
6. Each image candidate string is separated by a `,`.

We intentionally implement a loose rule here so that we can perform more aggressive error handling and reporting in the below code.
*/
const imageCandidateRegex = /\s*([^,]\S*[^,](?:\s+[^,]+)?)\s*(?:,|$)/;

function deepUnique(array) {
	return array.sort().filter((element, index) => {
		return JSON.stringify(element) !== JSON.stringify(array[index - 1]);
	});
}

exports.parse = string => {
	return deepUnique(
		string.split(imageCandidateRegex)
			.filter((part, index) => index % 2 === 1)
			.map(part => {
				const [url, ...elements] = part.trim().split(/\s+/);

				const result = {url};

				const descriptors = elements.length > 0 ? elements : ['1x'];

				for (const descriptor of descriptors) {
					const postfix = descriptor[descriptor.length - 1];
					const value = Number.parseFloat(descriptor.slice(0, -1));

					if (Number.isNaN(value)) {
						throw new TypeError(`${descriptor.slice(0, -1)} is not a valid number`);
					}

					if (postfix === 'w') {
						if (value <= 0) {
							throw new Error('Width descriptor must be greater than zero');
						} else if (!Number.isInteger(value)) {
							throw new TypeError('Width descriptor must be an integer');
						}

						result.width = value;
					} else if (postfix === 'x') {
						if (value <= 0) {
							throw new Error('Pixel density descriptor must be greater than zero');
						}

						result.density = value;
					} else {
						throw new Error(`Invalid srcset descriptor: ${descriptor}`);
					}

					if (result.width && result.density) {
						throw new Error('Image candidate string cannot have both width descriptor and pixel density descriptor');
					}
				}

				return result;
			})
	);
};

exports.stringify = array => {
	return [...new Set(
		array.map(element => {
			if (!element.url) {
				throw new Error('URL is required');
			}

			const result = [element.url];

			if (element.width) {
				result.push(`${element.width}w`);
			}

			if (element.density) {
				result.push(`${element.density}x`);
			}

			return result.join(' ');
		})
	)].join(', ');
};
