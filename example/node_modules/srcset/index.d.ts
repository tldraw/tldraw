declare namespace srcset {
	interface SrcSetDefinition {
		url: string;
		width?: number;
		density?: number;
	}
}

declare const srcset: {
	/**
	Parse the HTML `<img>` [srcset](http://mobile.smashingmagazine.com/2013/08/21/webkit-implements-srcset-and-why-its-a-good-thing/) attribute.

	@param srcset - A srcset string.

	@example
	```
	import srcset = require('srcset');

	console.log(srcset.parse('banner-HD.jpg 2x, banner-phone.jpg 100w'));
	// [
	// 	{
	// 		url: 'banner-HD.jpg',
	// 		density: 2
	// 	},
	// 	{
	// 		url: 'banner-phone.jpg',
	// 		width: 100
	// 	}
	// ]
	```
	*/
	parse: (srcset: string) => srcset.SrcSetDefinition[];

	/**
	Stringify `SrcSetDefinition`s.

	@returns A srcset string.

	@example
	```
	import srcset = require('srcset');

	const stringified = srcset.stringify([
		{
			url: 'banner-HD.jpg',
			density: 2
		},
		{
			url: 'banner-phone.jpg',
			width: 100
		},
		{
			url: 'banner-phone-HD.jpg',
			width: 100,
			density: 2
		}
	]);

	console.log(stringified);
	// banner-HD.jpg 2x, banner-phone.jpg 100w, banner-phone-HD.jpg 100w 2x
	```
	*/
	stringify: (srcSetDefinitions: srcset.SrcSetDefinition[]) => string;
};

export = srcset;
