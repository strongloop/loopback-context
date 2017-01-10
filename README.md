# loopback-context

Current context for LoopBack applications, based on cls-hooked.

## WARNING

**`cls-hooked` module uses undocumented `AsyncWrap` API that was introduced to Node.js relatively recently. While this new API seems to be more reliable than the old `async-listener` used by `continuation-local-storage`, there are still cases where the context (local storage) is not preserved correctly. Please consider this risk before using loopback-context.**

### Known issues

 - [when](https://www.npmjs.com/package/when), a popular Promise
   implementation, breaks context propagation. Please consider using the
   built-in `Promise` implementation provided by Node.js or
   [Bluebird](https://www.npmjs.com/package/bluebird) instead.

   Discussion: https://github.com/strongloop/loopback-context/issues/17

In general, any module that implements a custom task queue or a connection pool
is prone to break context storage. This is an inherent problem of continuation
local storage that needs to be fixed at lower level - first in Node.js core
and then in modules implementing task queues and connection pools.

## Installation

```
$ npm install --save loopback-context cls-hooked
```

Make sure you are running on a Node.js version supported by this module
(`^4.5`, `^5.10` or `^6.0`). When installing, check the output of `npm install`
and make sure there are no `engine` related warnings.

## Usage

### Setup cls-hooked

To minimize the likelihood of loosing context in your application, you should
ensure that `cls-hooked` is loaded as the first module of your application, so
that it can wrap certain Node.js APIs before any other modules start using these
APIs.

Our recommended approach is to add `-r cls-hooked` to node's list of
arguments when starting your LoopBack application.

```
$ node -r cls-hooked .
```

If you are using a process manager like `strong-pm` or `pm2`, then consult
their documentation whether it's possible to configure the arguments used to
spawn worker processes. Note that `slc run` does not support this feature yet,
see [strong-supervisor#56](https://github.com/strongloop/strong-supervisor/issues/56).

Alternatively, you can add the following line as the first line of your main
application file:

```js
require('cls-hooked');
```

This approach should be compatible with all process managers, including
`strong-pm`. However, we feel that relying on the order of `require` statements
is error-prone.

### Re-bind for concurrency

In order to workaround the aforementioned concurrency issue with `when` (and
similar `Promise`-like and other libraries implementing custom queues and/or
connection pools), it's recommended to activate context re-binding inside each
HTTP request or concurrent `runInContext()` call, by using the `bind` option, as
in this example:

    var ctx = LoopBackContext.getCurrentContext({ bind: true });

The `bind` option defaults to `false` (only in order to prevent breaking legacy
apps). But if you are writing a new app, for example, you can safely use
`bind: true` everywhere in your app.

**Warning**: this only applies to application modules. In fact, if the module
affected by the concurrency issue is of this kind, you can easily refactor/write
your own code so to enable `bind`. Not if it's a 3rd-party module, nor a
Loopback non-core module, unless you fork and fix it.

### Configure context propagation

To setup your LoopBack application to create a new context for each incoming
HTTP request, configure `per-context` middleware in your
`server/middleware.json` as follows:


```json
{
  "initial": {
    "loopback-context#per-request": {
    }
  }
}
```

**IMPORTANT: By default, the HTTP req/res objects are not set onto the current context. You
need to set `enableHttpContext` to true to enable automatic population
of req/res objects.**

```json
{
  "initial": {
    "loopback-context#per-request": {
      "params": {
        "enableHttpContext": true
      }
    }
  }
}
```

### Use the current context

Once you’ve enabled context propagation, you can access the current context
object using `LoopBackContext.getCurrentContext()`. The context will be
available in middleware (if it is loaded after the context middleware),
remoting hooks, model hooks, and custom methods.

```js
var LoopBackContext = require('loopback-context');

// ...

MyModel.myMethod = function(cb) {
  var ctx = LoopBackContext.getCurrentContext();
  ctx.get('key');
  ctx.set('key', { foo: 'bar' });
});
```

### Use current authenticated user in remote methods

In advanced use cases, for example when you want to add custom middleware, you
have to add the context middleware at the right position in the middleware
chain (before the middleware that depends on
`LoopBackContext.getCurrentContext`).

**IMPORTANT: `LoopBackContext.perRequest()` detects the situation when it is
invoked multiple times on the same request and returns immediately in
subsequent runs.**

Here is a snippet using a middleware function to place the currently
authenticated user into the context so that remote methods may use it:

**server/middleware/store-current-user.js**
```js
module.exports = function(options) {
  return function storeCurrentUser(req, res, next) {
    if (!req.accessToken) {
      return next();
    }

    app.models.UserModel.findById(req.accessToken.userId, function(err, user) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(new Error('No user with this access token was found.'));
      }
      var loopbackContext = LoopBackContext.getCurrentContext();
      if (loopbackContext) {
        loopbackContext.set('currentUser', user);
      }
      next();
    });
  };
};
```

**server/middleware.json**
```json
{
  "initial": {
    "loopback-context#per-request": {}
  },
  "auth": {
    "loopback#token": {}
  },
  "auth:after": {
    "./middleware/set-current-user": {}
  }
}
```

**common/models/YourModel.json**
```js
var LoopBackContext = require('loopback-context');
module.exports = function(YourModel) {
  ...
  //remote method
  YourModel.someRemoteMethod = function(arg1, arg2, cb) {
    var ctx = LoopBackContext.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    console.log('currentUser.username: ', currentUser.username); // voila!
    ...
    cb(null);
  };
  ...
};
```
