# loopback-context-cls

Current context for LoopBack applications, based on
node-continuation-local-storage.

## Usage

1) Add `per-request-context` middleware to your
`server/middleware-config.json`:

```json
{
  "initial": {
    "loopback-context-cls#per-request-context": {
    }
  }
}
```

2) Then you can access the context from your code:

```js
var ClsContext = require('loopback-context-cls');

// ...

MyModel.myMethod = function(cb) {
  var ctx = ClsContext.getCurrentContext();
  ctx.get('key');
  ctx.set('key', { foo: 'bar' });
});
```

See also https://docs.strongloop.com/display/APIC/Using+current+context
