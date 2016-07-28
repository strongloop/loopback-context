// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var ClsContext = require('..');
var Domain = require('domain');
var EventEmitter = require('events').EventEmitter;
var expect = require('./helpers/expect');
var loopback = require('loopback');
var request = require('supertest');

describe('CLS Context', function() {
  var runInOtherDomain, runnerInterval;

  before(function setupRunInOtherDomain() {
    var emitterInOtherDomain = new EventEmitter();
    Domain.create().add(emitterInOtherDomain);

    runInOtherDomain = function(fn) {
      emitterInOtherDomain.once('run', fn);
    };

    runnerInterval = setInterval(function() {
      emitterInOtherDomain.emit('run');
    }, 10);
  });

  after(function tearDownRunInOtherDomain() {
    clearInterval(runnerInterval);
  });

  // See the following two items for more details:
  // https://github.com/strongloop/loopback/issues/809
  // https://github.com/strongloop/loopback/pull/337#issuecomment-61680577
  it('preserves callback domain', function(done) {
    var app = loopback({localRegistry: true, loadBuiltinModels: true});
    app.set('remoting', {context: false});
    app.use(require('../server/middleware/per-request-context')());
    app.use(loopback.rest());
    app.dataSource('db', {connector: 'memory'});

    var TestModel = loopback.createModel({name: 'TestModel'});
    app.model(TestModel, {dataSource: 'db', public: true});

    // function for remote method
    TestModel.test = function(inst, cb) {
      var tmpCtx = ClsContext.getCurrentContext();
      if (tmpCtx) tmpCtx.set('data', 'a value stored in context');
      if (process.domain) cb = process.domain.bind(cb);  // IMPORTANT
      runInOtherDomain(cb);
    };

    // remote method
    TestModel.remoteMethod('test', {
      accepts: {arg: 'inst', type: 'TestModel'},
      returns: {root: true},
      http: {path: '/test', verb: 'get'},
    });

    // after remote hook
    TestModel.afterRemote('**', function(ctxx, inst, next) {
      var tmpCtx = ClsContext.getCurrentContext();
      if (tmpCtx) {
        ctxx.result.data = tmpCtx.get('data');
      } else {
        ctxx.result.data = 'context not available';
      }

      next();
    });

    request(app)
      .get('/TestModels/test')
      .end(function(err, res) {
        if (err) return done(err);

        expect(res.body.data).to.equal('a value stored in context');

        done();
      });
  });

  it('works outside REST middleware', function(done) {
    ClsContext.runInContext(function() {
      var ctx = ClsContext.getCurrentContext();
      expect(ctx).is.an('object');
      ctx.set('test-key', 'test-value');
      process.nextTick(function() {
        var ctx = ClsContext.getCurrentContext();
        expect(ctx).is.an('object');
        expect(ctx.get('test-key')).to.equal('test-value');

        done();
      });
    });
  });
});
