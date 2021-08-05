# @parcel/transformer-babel

This Parcel transformer plugin is responsible for transforming assets with Babel. It uses `@babel/core` to resolve babel config the same way Babel does and uses that if found. If no filesystem config is found it uses a default config that supports the most common cases.

## Default config

- `@babel/preset-env` - Uses the targets defined in `package.json` or a default set of targets if none are defined to pass to `@babel/preset-env` as options. It runs over all source code as well as installed packages that have a browserslist with higher targets than the app being built by Parcel.
- `@babel/plugin-flow-strip-types` - Right now it configures the flow plugin which uses the ast to check if there is a flow directive and strips types if so [TODO: It should do a cheap check of the code and only apply the plugin if a flow directive is found as it may affect parsing when it shouldn't]
- `@babel/plugin-transform-typescript` - Configured for files with extenions `.ts` and `.tsx`
- `@babel/plugin-transform-react-jsx` - Configured if file has extension `.jsx` or if a React like dependency is found as a dependency in package.json.

## Custom config perf warnings

Parcel now supports all configuration formats that Babel supports, but some of them come with negative performance impacts.

- `babel.config.js`/`.babelrc.js` - Since Babel 7, config files as JS are now supported. While this provides flexibility it hurts cacheability. Parcel cannot cache using the contents of the these files because the config they return is non deterministic based on content alone. Imported dependencies may change or the results may be based on environment variables. For this reason Parcel has to resolve load these files on each build and make sure their output is still the same. Another downside to using JS config files is that they end up being `require()`ed by Babel so Parcel cannot rebuild when the file changes in watch mode. To avoid these performance penalties, it is suggested that you use a `babel.config.json` or `.babelrc` file instead.
- `require('@babel')` - With the advent of JS config files, it is now possible to directly require presets and plugins in configs instead of using names or paths that are resolved by Babel. Unfortunately this gives Parcel no information about which plugins/presets were used in a transformation so Parcel will be forced to run the Babel transformations on every build. It is suggested to avoid this type of configuration.
