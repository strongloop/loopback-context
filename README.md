# loopback-context

Current context for LoopBack applications, based on
cls-hooked.

## USAGE WARNING

**Only if you use this package, it's recommended to not run your app using `slc run` or `node .`**

Run using (recommended):

`node -r cls-hooked .`

This uses the `-r` option in order to require `cls-hooked` before your app (see warnings below for more info).

If you wish to use `strong-supervisor`, you would need to pass node options to `slc run`, which currently has issues, according to [strong-supervisor#56](https://github.com/strongloop/strong-supervisor/issues/56).

A less reliable, less recommended way, which instead should be compatible with `strong-supervisor`, would be to add this Javascript line at the first line of your app, and no later than that (**the order of require statements matters**):

`require('cls-hooked')`

Warning: to rely on the order of `require` statements is error-prone.

## INSTALL WARNING

**Only if you use this package, do NOT install your app using `npm install`.**

Install using:

```
npm config set engine-strict true
npm install
```

This keeps you from using Node < v4.5.

## WARNING

**We recommend AGAINST using the loopback-context module until there is a stable solution to the issue below!**

The module node-continuation-local-storage is known to have many problems,
see e.g. [issue #59](https://github.com/othiym23/node-continuation-local-storage/issues/59).
As a result, loopback-context does not work in many situations, as can be
seen from issues reported in LoopBack's
[issue tracker](https://github.com/strongloop/loopback/issues?utf8=%E2%9C%93&q=is%3Aissue%20getCurrentcontext).

The new alternative
[cls-hooked](https://github.com/Jeff-Lewis/cls-hooked) is known to possibly inherit these problems if it's not imported before everything else, that's why you are required to follow the advice above if using this.

## Usage

1) Add `per-request` middleware to your
`server/middleware-config.json`:

```json
{
  "initial": {
    "loopback-context#per-request": {
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

See the official LoopBack
[documentation](https://docs.strongloop.com/display/APIC/Using+current+context)
for more details.
