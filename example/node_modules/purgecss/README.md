# PurgeCSS

![David](https://img.shields.io/david/FullHuman/purgecss?path=packages%2Fpurgecss&style=for-the-badge)
![David](https://img.shields.io/david/dev/FullHuman/purgecss?path=packages%2Fpurgecss&style=for-the-badge)
![Dependabot](https://img.shields.io/badge/dependabot-enabled-%23024ea4?style=for-the-badge)
![npm](https://img.shields.io/npm/v/purgecss?style=for-the-badge)
![npm](https://img.shields.io/npm/dw/purgecss?style=for-the-badge)
![GitHub](https://img.shields.io/github/license/FullHuman/purgecss?style=for-the-badge)

<p align="center">
	<img src="https://i.imgur.com/UEiUiJ0.png" height="200" width="200" alt="PurgeCSS logo"/>
</p>

## What is PurgeCSS?

When you are building a website, chances are that you are using a css framework like Bootstrap, Materializecss, Foundation, etc... But you will only use a small set of the framework and a lot of unused css styles will be included.

This is where PurgeCSS comes into play. PurgeCSS analyzes your content and your css files. Then it matches the selectors used in your files with the one in your content files. It removes unused selectors from your css, resulting in smaller css files.

## Sponsors 🥰

[<img src="https://avatars0.githubusercontent.com/u/67109815?v=4" height="85" style="margin-right: 10px">](https://tailwindcss.com)
[<img src="https://avatars.githubusercontent.com/u/6852555?&v=4" height="85">](https://vertistudio.com/)

## Documentation

You can find the PurgeCSS documentation on [this website](https://purgecss.com).

### Table of Contents

#### PurgeCSS

- [Configuration](https://purgecss.com/configuration.html)
- [Command Line Interface](https://purgecss.com/CLI.html)
- [Programmatic API](https://purgecss.com/api.html)
- [Safelisting](https://purgecss.com/safelisting.html)
- [Extractors](https://purgecss.com/extractors.html)
- [Comparison](https://purgecss.com/comparison.html)

#### Plugins

- [PostCSS](https://purgecss.com/plugins/postcss.html)
- [Webpack](https://purgecss.com/plugins/webpack.html)
- [Gulp](https://purgecss.com/plugins/gulp.html)
- [Grunt](https://purgecss.com/plugins/grunt.html)
- [Gatsby](https://purgecss.com/plugins/gatsby.html)

#### Guides

- [Vue.js](https://purgecss.com/guides/vue.html)
- [Nuxt.js](https://purgecss.com/guides/nuxt.html)
- [React.js](https://purgecss.com/guides/react.html)
- [Next.js](https://purgecss.com/guides/next.html)
- [Razzle](https://purgecss.com/guides/razzle.html)

## Getting Started

#### Installation

```
npm i --save-dev purgecss
```

## Usage

```js
import PurgeCSS from 'purgecss'
const purgeCSSResults = await new PurgeCSS().purge({
  content: ['**/*.html'],
  css: ['**/*.css']
})
```

## Contributing

Please read [CONTRIBUTING.md](./../../CONTRIBUTING.md) for details on our code of
conduct, and the process for submitting pull requests to us.

## Versioning

PurgeCSS use [SemVer](http://semver.org/) for versioning.

## License

This project is licensed under the MIT License - see the [LICENSE](./../../LICENSE) file
for details.
