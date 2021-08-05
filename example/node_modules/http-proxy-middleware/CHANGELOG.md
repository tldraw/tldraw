# Changelog

## [v1.3.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.3.1)

- fix(fix-request-body): make sure the content-type exists ([#578](https://github.com/chimurai/http-proxy-middleware/pull/578)) ([oufeng](https://github.com/oufeng))

## [v1.3.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.3.0)

- docs(response interceptor): align with nodejs default utf8 ([#567](https://github.com/chimurai/http-proxy-middleware/pull/567))
- feat: try to proxy body even after body-parser middleware ([#492](https://github.com/chimurai/http-proxy-middleware/pull/492)) ([midgleyc](https://github.com/midgleyc))

## [v1.2.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.2.1)

- fix(response interceptor): proxy original response headers ([#563](https://github.com/chimurai/http-proxy-middleware/pull/563))

## [v1.2.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.2.0)

- feat(handler): response interceptor ([#520](https://github.com/chimurai/http-proxy-middleware/pull/520))
- fix(log error): handle undefined target when websocket errors ([#527](https://github.com/chimurai/http-proxy-middleware/pull/527))

## [v1.1.2](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.1.2)

- fix(log error): handle optional target ([#523](https://github.com/chimurai/http-proxy-middleware/pull/523))

## [v1.1.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.1.1)

- fix(error handler): re-throw http-proxy missing target error ([#517](https://github.com/chimurai/http-proxy-middleware/pull/517))
- refactor(dependency): remove `camelcase`
- fix(option): optional `target` when `router` is used ([#512](https://github.com/chimurai/http-proxy-middleware/pull/512))

## [v1.1.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.1.0)

- fix(errorHandler): fix confusing error message ([#509](https://github.com/chimurai/http-proxy-middleware/pull/509))
- fix(proxy): close proxy when server closes ([#508](https://github.com/chimurai/http-proxy-middleware/pull/508))
- refactor(lodash): remove lodash ([#459](https://github.com/chimurai/http-proxy-middleware/pull/459)) ([#507](https://github.com/chimurai/http-proxy-middleware/pull/507)) ([TrySound](https://github.com/TrySound))
- fix(ETIMEDOUT): return 504 on ETIMEDOUT ([#480](https://github.com/chimurai/http-proxy-middleware/pull/480)) ([aremishevsky](https://github.com/aremishevsky))

## [v1.0.6](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.6)

- chore(deps): lodash 4.17.20 ([#475](https://github.com/chimurai/http-proxy-middleware/pull/475))

## [v1.0.5](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.6)

- chore(deps): lodash 4.17.19 ([#454](https://github.com/chimurai/http-proxy-middleware/pull/454))

## [v1.0.4](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.4)

- chore(deps): http-proxy 1.18.1 ([#442](https://github.com/chimurai/http-proxy-middleware/pull/442))

## [v1.0.3](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.3)

- build(package): exclude build artifact tsconfig.tsbuildinfo ([#415](https://github.com/chimurai/http-proxy-middleware/pull/415))

## [v1.0.2](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.2)

- fix(router): handle rejected promise in custom router ([#410](https://github.com/chimurai/http-proxy-middleware/pull/413)) ([bforbis](https://github.com/bforbis))

## [v1.0.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.1)

- fix(typescript): fix proxyRes and router types ([#410](https://github.com/chimurai/http-proxy-middleware/issues/410)) ([dylang](https://github.com/dylang))

## [v1.0.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v1.0.0)

- feat(createProxyMiddleware): explicit import http-proxy-middleware ([BREAKING CHANGE](https://github.com/chimurai/http-proxy-middleware/releases))([#400](https://github.com/chimurai/http-proxy-middleware/issues/400#issuecomment-587162378))
- feat(typescript): export http-proxy-middleware types ([#400](https://github.com/chimurai/http-proxy-middleware/issues/400))
- fix(typescript): ES6 target - TS1192 ([#400](https://github.com/chimurai/http-proxy-middleware/issues/400#issuecomment-587064349))

## [v0.21.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.21.0)

- feat(http-proxy): bump to v1.18.0
- feat: async router ([#379](https://github.com/chimurai/http-proxy-middleware/issues/379)) ([LiranBri](https://github.com/LiranBri))
- feat(typescript): types support ([#369](https://github.com/chimurai/http-proxy-middleware/pull/369))
- feat: async pathRewrite ([#397](https://github.com/chimurai/http-proxy-middleware/pull/397)) ([rsethc](https://github.com/rsethc))

## [v0.20.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.20.0)

- fix(ws): concurrent websocket requests do not get upgraded ([#335](https://github.com/chimurai/http-proxy-middleware/issues/335))
- chore: drop node 6 (BREAKING CHANGE)
- chore: update to micromatch@4 ([BREAKING CHANGE](https://github.com/micromatch/micromatch/blob/master/CHANGELOG.md#400---2019-03-20))
- chore: update dev dependencies
- refactor: migrate to typescript ([#328](https://github.com/chimurai/http-proxy-middleware/pull/328))
- feat(middleware): Promise / async support ([#328](https://github.com/chimurai/http-proxy-middleware/pull/328/files#diff-7890bfeb41abb0fc0ef2670749c84077R50))
- refactor: remove legacy options `proxyHost` and `proxyTable` (BREAKING CHANGE)

## [v0.19.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.19.1)

- fix(log): handle case when error code is missing ([#303](https://github.com/chimurai/http-proxy-middleware/pull/303))

## [v0.19.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.19.0)

- feat(http-proxy): bump to v1.17.0 ([#261](https://github.com/chimurai/http-proxy-middleware/pull/261))

## [v0.18.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.18.0)

- fix(vulnerability): update micromatch to v3.x ([npm:braces:20180219](https://snyk.io/test/npm/http-proxy-middleware?tab=issues&severity=high&severity=medium&severity=low#npm:braces:20180219))
- test(node): drop node 0.x support ([#212](https://github.com/chimurai/http-proxy-middleware/pull/212))

## [v0.17.4](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.17.4)

- fix(ntlm authentication): fixed bug preventing proxying with ntlm authentication. ([#132](https://github.com/chimurai/http-proxy-middleware/pull/149)) (Thanks: [EladBezalel](https://github.com/EladBezalel), [oshri551](https://github.com/oshri551))

## [v0.17.3](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.17.3)

- fix(onError): improve default proxy error handling. http status codes (504, 502 and 500). ([#132](https://github.com/chimurai/http-proxy-middleware/pull/132)) ([graingert](https://github.com/graingert))

## [v0.17.2](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.17.2)

- feat(logging): improve error message & add link to Node errors page. ([#106](https://github.com/chimurai/http-proxy-middleware/pull/106)) ([cloudmu](https://github.com/cloudmu))
- feat(pathRewrite): path can be empty string. ([#110](https://github.com/chimurai/http-proxy-middleware/pull/110)) ([sunnylqm](https://github.com/sunnylqm))
- bug(websocket): memory leak when option 'ws:true' is used. ([#114](https://github.com/chimurai/http-proxy-middleware/pull/114)) ([julbra](https://github.com/julbra))
- chore(package.json): reduce package size. ([#109](https://github.com/chimurai/http-proxy-middleware/pull/109))

## [v0.17.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.17.1)

- fix(Express sub Router): 404 on non-proxy routes ([#94](https://github.com/chimurai/http-proxy-middleware/issues/94))

## [v0.17.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.17.0)

- fix(context matching): Use [RFC 3986 path](https://tools.ietf.org/html/rfc3986#section-3.3) in context matching. (excludes query parameters)

## [v0.16.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.16.0)

- deprecated(proxyTable): renamed `proxyTable` to `router`.
- feat(router): support for custom `router` function.

## [v0.15.2](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.15.2)

- fix(websocket): fixes websocket upgrade.

## [v0.15.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.15.1)

- feat(pathRewrite): expose `req` object to pathRewrite function.
- fix(websocket): fixes websocket upgrade when both config.ws and external .upgrade() are used.

## [v0.15.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.15.0)

- feat(pathRewrite): support for custom pathRewrite function.

## [v0.14.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.14.0)

- feat(proxy): support proxy creation without context.
- fix(connect mounting): use connect's `path` configuration to mount proxy.

## [v0.13.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.13.0)

- feat(context): custom context matcher; when simple `path` matching is not sufficient.

## [v0.12.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.12.0)

- add option `onProxyReqWs` (subscribe to http-proxy `proxyReqWs` event)
- add option `onOpen` (subscribe to http-proxy `open` event)
- add option `onClose` (subscribe to http-proxy `close` event)

## [v0.11.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.11.0)

- improved logging

## [v0.10.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.10.0)

- feat(proxyTable) - added proxyTable support for WebSockets.
- fixed(proxyTable) - ensure original path (not rewritten path) is being used when `proxyTable` is used in conjunction with `pathRewrite`.

## [v0.9.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.9.1)

- fix server crash when socket error not handled correctly.

## [v0.9.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.9.0)

- support subscribing to http-proxy `proxyReq` event ([trbngr](https://github.com/trbngr))
- add `logLevel` and `logProvider` support

## [v0.8.2](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.8.2)

- fix proxyError handler ([mTazelaar](https://github.com/mTazelaar))

## [v0.8.1](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.8.1)

- fix pathRewrite when `agent` is configured

## [v0.8.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.8.0)

- support external websocket upgrade
- fix websocket shorthand

## [v0.7.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.7.0)

- support shorthand syntax
- fix express/connect mounting

## [v0.6.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.6.0)

- support proxyTable

## [v0.5.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.5.0)

- support subscribing to http-proxy `error` event
- support subscribing to http-proxy `proxyRes` event

## [v0.4.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.4.0)

- support websocket

## [v0.3.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.3.0)

- support wildcard / glob

## [v0.2.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.2.0)

- support multiple paths

## [v0.1.0](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.1.0)

- support path rewrite
- deprecate proxyHost option

## [v0.0.5](https://github.com/chimurai/http-proxy-middleware/releases/tag/v0.0.5)

- initial release
