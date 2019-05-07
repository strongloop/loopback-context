// Copyright IBM Corp. 2016. All Rights Reserved.
// Node module: loopback-context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var contextPerRequest = require('../server/middleware/per-request.js');
// Use `var lbContext = require('loopback-context');` in your app
var lbContext = require('../');
var loopback = require('loopback');

var app = loopback();

// Configure the context middleware
app.middleware('initial', contextPerRequest());

// Store a request property in the context
app.use(function saveHostToContext(req, res, next) {
  var currentContext = lbContext.getCurrentContext();
  if (currentContext)
    currentContext.set('host', req.hostname);
  next();
});

app.use(loopback.rest());

var Color = loopback.createModel('color', {name: String});
Color.beforeRemote('**', function(ctx, unused, next) {
  // Inside LoopBack code, you can read the property from the context
  var currentContext = lbContext.getCurrentContext();
  if (currentContext)
    console.log('Request to host %s',
      currentContext && currentContext.get('host'));
  next();
});

app.dataSource('db', {connector: 'memory'});
app.model(Color, {dataSource: 'db'});

app.listen(3000, function() {
  console.log('A list of colors is available at http://localhost:3000/colors');
});
