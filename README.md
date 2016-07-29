# loopback-context

Current context for LoopBack applications, based on
cls-hooked.

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
