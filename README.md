# loopback-context

Current context for LoopBack applications, based on
cls-hooked.

## Main changes in `cls-hooked` branch

The work-in-progress `cls-hooked` branch uses `cls-hooked` NPM package, which in turn uses `async-hook`. The latter requires Node > 4.5 as specified in its own `package.json`. **This change alone doesn't solve, for now, any problem with `loopback-context`, especially issues related to lost context (for example see [loopback #1495](https://github.com/strongloop/loopback/issues/1495)), as far as the writer knows**. But it uses Node `AsyncWrap`, which may have some pros in the long term.

However, as a work-in-progress, this branch also includes the experimental package `cls-hooked-interceptor` (**not ready for production**), which should give useful warnings when there is the risk that the context would get lost at runtime. **Neither this solves any problem with `loopback-context`**. It's just *a work-in-progress that will eventually help with debugging and mantaining apps experiencing such issues, common especially in legacy apps*.

Therefore, **what is the solution to issues with lost context?** For now, you should implement your own solution. For example, the writer uses the `npm shrinkwrap` solution mentioned in [loopback #1495](https://github.com/strongloop/loopback/issues/1495), but even this could be useless for you, in case you get a broken install (this is unpredictable and hard to notice, and this package wants to change that).

To test this branch, just run the tests with `npm test`. (You will also see a warning from `cls-hooked-interceptor`, in addition to the test output; this is the desired behavior).

If you want to see all the infos and warnings that `cls-hooked-interceptor` sends to the `debug` package, declare the environment variable `DEBUG=cls-hooked-interceptor` when running the tests.

OS X example:

`DEBUG=cls-hooked-interceptor npm test`

By default, the test makes the context get lost. If you want to test the opposite case when the package does *not* warn, because the context is *not* lost, just declare the environment variable `KEEP_CONTEXT=true` when running the tests (*this variable has no effect outside of tests!*).

OS X example:

`KEEP_CONTEXT=true npm test`

**TODO**: try to refactor the tests using the package `lose-cls-context`.

## Usage

1) Add `per-request-context` middleware to your
`server/middleware-config.json`:

```json
{
  "initial": {
    "loopback-context#per-request-context": {
    }
  }
}
```

2) Then you can access the context from your code:

```js
var LoopBackContext = require('loopback-context');

// ...

MyModel.myMethod = function(cb) {
  var ctx = LoopBackContext.getCurrentContext();
  ctx.get('key');
  ctx.set('key', { foo: 'bar' });
});
```

See also https://docs.strongloop.com/display/APIC/Using+current+context
