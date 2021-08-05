# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).


## [1.0.0] - 2021-04-17
After more than 4 years of development, it's time to release a stable [1.0.0](https://github.com/posthtml/htmlnano/releases/tag/1.0.0) version 🎉

It doesn't contain anything new from the previous [0.2.9](https://github.com/posthtml/htmlnano/releases/tag/0.2.9) release.
We just did a major upgrade of two dependencies: [PurgeCSS](https://purgecss.com/) and [SVGO](https://github.com/svg/svgo),
which changed their config format.
Thus we have to do a major release of `htmlnano`.

You can safely upgrade to `htmlnano@1.0.0` if you don't pass any config to `minifySvg` or `removeUnusedCss` (while used with PurgeCSS) modules.
Otherwise, you have to adapt the config according to the new [PurgeCSS@3](https://github.com/FullHuman/purgecss/releases/tag/v3.0.0) and [SVGO@2](https://github.com/svg/svgo/releases/tag/v2.0.0) config format.



## [0.2.9] - 2021-04-11
### Added
- `minifyConditionalComment` support `<html>` [#125].
- Minify JS within `<script type="module">` [#135].

### Fixed
- `collapseWhitespaces` around comment [#120].
- handle `CDATA` inside script correctly [#122].
- Minify SVG correctly [#129].

### Changed
- Upgrade to terser@5 (JS minification).



## [0.2.8] - 2020-11-15
### Added
- [`removeOptionalTags`](https://github.com/posthtml/htmlnano#removeoptionaltags) [#110].
- [`sortAttributes`](https://github.com/posthtml/htmlnano#removeoptionaltags) [#113].
- `source[src]` and `srcset` support to `minifyUrls` [#117].
- [`minifyConditionalComments`](https://github.com/posthtml/htmlnano#minifyconditionalcomments) [#119].

### Changed
- Sort by frequency `sortAttributesWithLists` [#111].
- Strip more spaces in `collapseWhitespace` [#112].
- Remove `loading="eager"` from `<img>` and `<iframe>` [#114].
- Remove redundant `type` from `<script>` [#114].
- Strip whitespaces between textnode and element [#116].



## [0.2.7] - 2020-10-17
### Added
- More aggressive whitespace removal option [#90].
- Cloudflare SSE support to `removeComments` [#94].
- Improve compression ratio by sorting attribute values [#95].
- New `minifyUrls` module [#98].
- New `removeAttributeQuotes` module [#104].
- Remove `type=text/css` for `link[rel=stylesheet]` [#102].
- Collapse `crossorigin` attributes [#107].
- Exclude excerpt comment for common CMS [#108].

### Fixed
- Keep JS inside SVG wrapped in `//<![CDATA[ //]]` [#88].


## [0.2.6] - 2020-07-15
### Added
- Let PostHTML options to be passed.

### Fixed
- `<script>` tags merging without content.


## [0.2.5] - 2019-11-09
### Added
- Option to remove unused CSS using PurgeCSS [#84].

### Fixed
- Keep the order of inline and external JS [#80].


## [0.2.4] - 2019-07-11
### Fixed
- Remove crossorigin from boolean attribute [#78], [#79].
- Disable SVGO plugin convertShapeToPath in safe preset [#76].


## [0.2.3] - 2019-02-14
### Fixed
- Keep `<g>` in SVG by default [#71].


## [0.2.2] - 2019-01-03
### Added
- `removeUnusedCss` module [#36].

### Fixed
- Bug when `tag === false` [#66].
- Add `crossorigin` to boolean attributes [#67].


## [0.2.1] - 2018-12-01
### Fixed
- Disable JS minifying on AMP pages [#65].

## [0.2.0] - 2018-09-14
### Breaking changes
- The API of `minifyCss` module has been changed since `cssnano` has been updated to version 4, which has a different API. Check the following resources for more info:
  * [htmlnano docs](https://github.com/posthtml/htmlnano#minifycss)
  * [cssnano docs](https://cssnano.co/guides/presets)
  * Diff of commit [979f2c](https://github.com/posthtml/htmlnano/commit/979f2c821892c9e979e8b85f74ed0394330fceaf) with the changes of related docs.

### Added
- Add presets [#64].
- Add `collapseAttributeWhitespace` module for collapsing spaces in list-like attributes [#25].
- Add `deduplicateAttributeValues` module for de-duplicating values in list-like attributes [#39].
- Better support for AMP pages [#59].
- Collapse whitespaces between top-level tags [#24].

### Changed
- Improve whitespace normalization using `normalize-html-whitespace` [#21].

### Fixed
- Don't collapse `visible="false"` attributes in A-Frame pages [#62].



## [0.1.10] - 2018-08-03
### Fixed
- Merging `<script>` tags without leading `;` [#55].


## [0.1.9] - 2018-04-29
### Fixed
- Default minification options safety [#50].


## [0.1.8] - 2018-04-17
### Fixed
- ES6+ minification [#48].



## [0.1.7] - 2018-03-13
### Fixed
- Update dependencies which also fixes the SVG minification bug [#47].



## [0.1.6] - 2017-06-27
### Fixed
- "Not a function" error [#42].



## [0.1.5] - 2016-04-24
### Added
- Minify SVG [#28].
- Merge `<script>` [#19].

### Changed
- Remove redundant `type="submit"` from `<button>` [#31].

### Fixed
- Windows build [#30].


## [0.1.4] - 2016-02-16
### Added
- Minify JSON.
- Merge multiple `<style>` into one.
- Collapse boolean attributes.
- Remove redundant attributes.
- HTML minifiers benchmark [#22].

### Changed
- Expand list of JSON-like mime types [#20].


## [0.1.3] - 2016-02-09
### Fixed
- Don't alter HTML comments inside not relevant modules [#17].


## [0.1.2] - 2016-02-07
### Fixed
- Don't remove conditional comments in safe mode [#13].
- Downgrade: `String.startsWith -> String.search`.


## [0.1.1] - 2016-01-31
### Added
- Minify CSS inside `<style>` tags and `style` attributes.
- Minify JS inside `<script>` tags and `on*` attributes.

### Changed
- Remove attributes that contains only white spaces.


[1.0.0]: https://github.com/posthtml/htmlnano/compare/0.2.9...1.0.0
[0.2.9]: https://github.com/posthtml/htmlnano/compare/0.2.8...0.2.9
[0.2.8]: https://github.com/posthtml/htmlnano/compare/0.2.7...0.2.8
[0.2.7]: https://github.com/posthtml/htmlnano/compare/0.2.6...0.2.7
[0.2.6]: https://github.com/posthtml/htmlnano/compare/0.2.5...0.2.6
[0.2.5]: https://github.com/posthtml/htmlnano/compare/0.2.4...0.2.5
[0.2.4]: https://github.com/posthtml/htmlnano/compare/0.2.3...0.2.4
[0.2.3]: https://github.com/posthtml/htmlnano/compare/0.2.2...0.2.3
[0.2.2]: https://github.com/posthtml/htmlnano/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/posthtml/htmlnano/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/posthtml/htmlnano/compare/0.1.10...0.2.0
[0.1.10]: https://github.com/posthtml/htmlnano/compare/0.1.9...0.1.10
[0.1.9]: https://github.com/posthtml/htmlnano/compare/0.1.8...0.1.9
[0.1.8]: https://github.com/posthtml/htmlnano/compare/0.1.7...0.1.8
[0.1.7]: https://github.com/posthtml/htmlnano/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/posthtml/htmlnano/compare/0.1.5...0.1.6
[0.1.5]: https://github.com/posthtml/htmlnano/compare/0.1.4...0.1.5
[0.1.4]: https://github.com/posthtml/htmlnano/compare/0.1.3...0.1.4
[0.1.3]: https://github.com/posthtml/htmlnano/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/posthtml/htmlnano/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/posthtml/htmlnano/compare/0.1.0...0.1.1

[#135]: https://github.com/posthtml/htmlnano/issues/135
[#129]: https://github.com/posthtml/htmlnano/issues/129
[#125]: https://github.com/posthtml/htmlnano/issues/125
[#122]: https://github.com/posthtml/htmlnano/issues/122
[#120]: https://github.com/posthtml/htmlnano/issues/120
[#119]: https://github.com/posthtml/htmlnano/issues/119
[#117]: https://github.com/posthtml/htmlnano/issues/117
[#116]: https://github.com/posthtml/htmlnano/issues/116
[#114]: https://github.com/posthtml/htmlnano/issues/114
[#113]: https://github.com/posthtml/htmlnano/issues/113
[#112]: https://github.com/posthtml/htmlnano/issues/112
[#111]: https://github.com/posthtml/htmlnano/issues/111
[#110]: https://github.com/posthtml/htmlnano/issues/110
[#107]: https://github.com/posthtml/htmlnano/issues/107
[#108]: https://github.com/posthtml/htmlnano/issues/108
[#102]: https://github.com/posthtml/htmlnano/issues/102
[#104]: https://github.com/posthtml/htmlnano/issues/104
[#98]: https://github.com/posthtml/htmlnano/issues/98
[#95]: https://github.com/posthtml/htmlnano/issues/95
[#94]: https://github.com/posthtml/htmlnano/issues/94
[#90]: https://github.com/posthtml/htmlnano/issues/90
[#88]: https://github.com/posthtml/htmlnano/issues/88
[#84]: https://github.com/posthtml/htmlnano/issues/84
[#80]: https://github.com/posthtml/htmlnano/issues/80
[#79]: https://github.com/posthtml/htmlnano/issues/79
[#78]: https://github.com/posthtml/htmlnano/issues/78
[#76]: https://github.com/posthtml/htmlnano/issues/76
[#71]: https://github.com/posthtml/htmlnano/issues/71
[#67]: https://github.com/posthtml/htmlnano/issues/67
[#66]: https://github.com/posthtml/htmlnano/issues/66
[#65]: https://github.com/posthtml/htmlnano/issues/65
[#64]: https://github.com/posthtml/htmlnano/issues/64
[#62]: https://github.com/posthtml/htmlnano/issues/62
[#59]: https://github.com/posthtml/htmlnano/issues/59
[#55]: https://github.com/posthtml/htmlnano/issues/55
[#50]: https://github.com/posthtml/htmlnano/issues/50
[#48]: https://github.com/posthtml/htmlnano/issues/48
[#47]: https://github.com/posthtml/htmlnano/issues/47
[#42]: https://github.com/posthtml/htmlnano/issues/42
[#39]: https://github.com/posthtml/htmlnano/issues/39
[#36]: https://github.com/posthtml/htmlnano/issues/36
[#31]: https://github.com/posthtml/htmlnano/issues/31
[#30]: https://github.com/posthtml/htmlnano/issues/30
[#28]: https://github.com/posthtml/htmlnano/issues/28
[#25]: https://github.com/posthtml/htmlnano/issues/25
[#24]: https://github.com/posthtml/htmlnano/issues/24
[#22]: https://github.com/posthtml/htmlnano/issues/22
[#21]: https://github.com/posthtml/htmlnano/issues/21
[#20]: https://github.com/posthtml/htmlnano/issues/20
[#19]: https://github.com/posthtml/htmlnano/issues/19
[#17]: https://github.com/posthtml/htmlnano/issues/17
[#13]: https://github.com/posthtml/htmlnano/issues/13
