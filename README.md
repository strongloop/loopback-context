# loopback-context

Current context for LoopBack applications, based on
cls-hooked.

## WARNING

**We recommend AGAINST using the loopback-context module until there is a stable solution to the issue below!**

The module node-continuation-local-storage is known to have many problems,
see e.g. [issue #59](https://github.com/othiym23/node-continuation-local-storage/issues/59).
As a result, loopback-context does not work in many situations, as can be
seen from issues reported in LoopBack's
[issue tracker](https://github.com/strongloop/loopback/issues?utf8=%E2%9C%93&q=is%3Aissue%20getCurrentcontext).

If you are running on Node v6, you can try the new alternative
[cls-hooked](https://github.com/Jeff-Lewis/cls-hooked).

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
