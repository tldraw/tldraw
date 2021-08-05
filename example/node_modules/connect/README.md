<div align="center">

<img src="logo/horizontal.png" alt="connect logo" width="450px">

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

</div>

  Connect is an extensible HTTP server framework for [node](http://nodejs.org) using "plugins" known as _middleware_.

```js
var connect = require('connect');
var http = require('http');

var app = connect();

// gzip/deflate outgoing responses
var compression = require('compression');
app.use(compression());

// store session state in browser cookie
var cookieSession = require('cookie-session');
app.use(cookieSession({
    keys: ['secret1', 'secret2']
}));

// parse urlencoded request bodies into req.body
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

// respond to all requests
app.use(function(req, res){
  res.end('Hello from Connect!\n');
});

//create node.js http server and listen on port
http.createServer(app).listen(3000);
```

## Getting Started

Connect is a simple framework to glue together various "middleware" to handle requests.

### Install Connect

```sh
$ npm install connect
```

### Create an app

The main component is a Connect "app". This will store all the middleware
added and is, itself, a function.

```js
var app = connect();
```

### Use middleware

The core of Connect is "using" middleware. Middleware are added as a "stack"
where incoming requests will execute each middleware one-by-one until a middleware
does not call `next()` within it.

```js
app.use(function middleware1(req, res, next) {
  // middleware 1
  next();
});
app.use(function middleware2(req, res, next) {
  // middleware 2
  next();
});
```

### Mount middleware

The `.use()` method also takes an optional path string that is matched against
the beginning of the incoming request URL. This allows for basic routing.

```js
app.use('/foo', function fooMiddleware(req, res, next) {
  // req.url starts with "/foo"
  next();
});
app.use('/bar', function barMiddleware(req, res, next) {
  // req.url starts with "/bar"
  next();
});
```

### Error middleware

There are special cases of "error-handling" middleware. There are middleware
where the function takes exactly 4 arguments. When a middleware passes an error
to `next`, the app will proceed to look for the error middleware that was declared
after that middleware and invoke it, skipping any error middleware above that
middleware and any non-error middleware below.

```js
// regular middleware
app.use(function (req, res, next) {
  // i had an error
  next(new Error('boom!'));
});

// error middleware for errors that occurred in middleware
// declared before this
app.use(function onerror(err, req, res, next) {
  // an error occurred!
});
```

### Create a server from the app

The last step is to actually use the Connect app in a server. The `.listen()` method
is a convenience to start a HTTP server (and is identical to the `http.Server`'s `listen`
method in the version of Node.js you are running).

```js
var server = app.listen(port);
```

The app itself is really just a function with three arguments, so it can also be handed
to `.createServer()` in Node.js.

```js
var server = http.createServer(app);
```

## Middleware

These middleware and libraries are officially supported by the Connect/Express team:

  - [body-parser](https://www.npmjs.com/package/body-parser) - previous `bodyParser`, `json`, and `urlencoded`. You may also be interested in:
    - [body](https://www.npmjs.com/package/body)
    - [co-body](https://www.npmjs.com/package/co-body)
    - [raw-body](https://www.npmjs.com/package/raw-body)
  - [compression](https://www.npmjs.com/package/compression) - previously `compress`
  - [connect-timeout](https://www.npmjs.com/package/connect-timeout) - previously `timeout`
  - [cookie-parser](https://www.npmjs.com/package/cookie-parser) - previously `cookieParser`
  - [cookie-session](https://www.npmjs.com/package/cookie-session) - previously `cookieSession`
  - [csurf](https://www.npmjs.com/package/csurf) - previously `csrf`
  - [errorhandler](https://www.npmjs.com/package/errorhandler) - previously `error-handler`
  - [express-session](https://www.npmjs.com/package/express-session) - previously `session`
  - [method-override](https://www.npmjs.com/package/method-override) - previously `method-override`
  - [morgan](https://www.npmjs.com/package/morgan) - previously `logger`
  - [response-time](https://www.npmjs.com/package/response-time) - previously `response-time`
  - [serve-favicon](https://www.npmjs.com/package/serve-favicon) - previously `favicon`
  - [serve-index](https://www.npmjs.com/package/serve-index) - previously `directory`
  - [serve-static](https://www.npmjs.com/package/serve-static) - previously `static`
  - [vhost](https://www.npmjs.com/package/vhost) - previously `vhost`

Most of these are exact ports of their Connect 2.x equivalents. The primary exception is `cookie-session`.

Some middleware previously included with Connect are no longer supported by the Connect/Express team, are replaced by an alternative module, or should be superseded by a better module. Use one of these alternatives instead:

  - `cookieParser`
    - [cookies](https://www.npmjs.com/package/cookies) and [keygrip](https://www.npmjs.com/package/keygrip)
  - `limit`
    - [raw-body](https://www.npmjs.com/package/raw-body)
  - `multipart`
    - [connect-multiparty](https://www.npmjs.com/package/connect-multiparty)
    - [connect-busboy](https://www.npmjs.com/package/connect-busboy)
  - `query`
    - [qs](https://www.npmjs.com/package/qs)
  - `staticCache`
    - [st](https://www.npmjs.com/package/st)
    - [connect-static](https://www.npmjs.com/package/connect-static)

Checkout [http-framework](https://github.com/Raynos/http-framework/wiki/Modules) for many other compatible middleware!

## API

The Connect API is very minimalist, enough to create an app and add a chain
of middleware.

When the `connect` module is required, a function is returned that will construct
a new app when called.

```js
// require module
var connect = require('connect')

// create app
var app = connect()
```

### app(req, res[, next])

The `app` itself is a function. This is just an alias to `app.handle`.

### app.handle(req, res[, out])

Calling the function will run the middleware stack against the given Node.js
http request (`req`) and response (`res`) objects. An optional function `out`
can be provided that will be called if the request (or error) was not handled
by the middleware stack.

### app.listen([...])

Start the app listening for requests. This method will internally create a Node.js
HTTP server and call `.listen()` on it.

This is an alias to the `server.listen()` method in the version of Node.js running,
so consult the Node.js documentation for all the different variations. The most
common signature is [`app.listen(port)`](https://nodejs.org/dist/latest-v6.x/docs/api/http.html#http_server_listen_port_hostname_backlog_callback).

### app.use(fn)

Use a function on the app, where the function represents a middleware. The function
will be invoked for every request in the order that `app.use` is called. The function
is called with three arguments:

```js
app.use(function (req, res, next) {
  // req is the Node.js http request object
  // res is the Node.js http response object
  // next is a function to call to invoke the next middleware
})
```

In addition to a plan function, the `fn` argument can also be a Node.js HTTP server
instance or another Connect app instance.

### app.use(route, fn)

Use a function on the app, where the function represents a middleware. The function
will be invoked for every request in which the URL (`req.url` property) starts with
the given `route` string in the order that `app.use` is called. The function is
called with three arguments:

```js
app.use('/foo', function (req, res, next) {
  // req is the Node.js http request object
  // res is the Node.js http response object
  // next is a function to call to invoke the next middleware
})
```

In addition to a plan function, the `fn` argument can also be a Node.js HTTP server
instance or another Connect app instance.

The `route` is always terminated at a path separator (`/`) or a dot (`.`) character.
This means the given routes `/foo/` and `/foo` are the same and both will match requests
with the URLs `/foo`, `/foo/`, `/foo/bar`, and `/foo.bar`, but not match a request with
the URL `/foobar`.

The `route` is matched in a case-insensitive manor.

In order to make middleware easier to write to be agnostic of the `route`, when the
`fn` is invoked, the `req.url` will be altered to remove the `route` part (and the
original will be available as `req.originalUrl`). For example, if `fn` is used at the
route `/foo`, the request for `/foo/bar` will invoke `fn` with `req.url === '/bar'`
and `req.originalUrl === '/foo/bar'`.

## Running Tests

```bash
npm install
npm test
```

## People

The Connect project would not be the same without all the people involved.

The original author of Connect is [TJ Holowaychuk](https://github.com/tj)

The current lead maintainer is [Douglas Christopher Wilson](https://github.com/dougwilson)

[List of all contributors](https://github.com/senchalabs/connect/graphs/contributors)

## Node Compatibility

  - Connect `< 1.x` - node `0.2`
  - Connect `1.x` - node `0.4`
  - Connect `< 2.8` - node `0.6`
  - Connect `>= 2.8 < 3` - node `0.8`
  - Connect `>= 3` - node `0.10`, `0.12`, `4.x`, `5.x`, `6.x`, `7.x`, `8.x`, `9.x`, `10.x`, `11.x`, `12.x`; io.js `1.x`, `2.x`, `3.x`

## License

[MIT](LICENSE)

[coveralls-image]: https://badgen.net/coveralls/c/github/senchalabs/connect/master
[coveralls-url]: https://coveralls.io/r/senchalabs/connect?branch=master
[npm-downloads-image]: https://badgen.net/npm/dm/connect
[npm-url]: https://npmjs.org/package/connect
[npm-version-image]: https://badgen.net/npm/v/connect
[travis-image]: https://badgen.net/travis/senchalabs/connect/master
[travis-url]: https://travis-ci.org/senchalabs/connect
