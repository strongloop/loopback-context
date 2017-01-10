// Copyright IBM Corp. 2013,2016. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var asyncV152 = require('async-1.5.2');
var whenV377 = require('when-3.7.7');
var LoopBackContext = require('..');
var Domain = require('domain');
var EventEmitter = require('events').EventEmitter;
var expect = require('./helpers/expect');
var loopback = require('loopback');
var request = require('supertest');

describe('LoopBack Context', function() {
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
    app.set('legacyExplorer', false);
    app.use(LoopBackContext.perRequest());
    app.use(loopback.rest());
    app.dataSource('db', {connector: 'memory'});

    var TestModel = loopback.createModel({name: 'TestModel'});
    app.model(TestModel, {dataSource: 'db', public: true});

    // function for remote method
    TestModel.test = function(inst, cb) {
      var tmpCtx = LoopBackContext.getCurrentContext();
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
      var tmpCtx = LoopBackContext.getCurrentContext();
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
    LoopBackContext.runInContext(function() {
      var ctx = LoopBackContext.getCurrentContext();
      expect(ctx).is.an('object');
      ctx.set('test-key', 'test-value');
      process.nextTick(function() {
        var ctx = LoopBackContext.getCurrentContext();
        expect(ctx).is.an('object');
        expect(ctx.get('test-key')).to.equal('test-value');

        done();
      });
    });
  });

  // Credits for the original idea for this test case to @marlonkjoseph
  // Original source of the POC gist of the idea:
  // https://gist.github.com/marlonkjoseph/f42f3c71f746896a0d4b7279a34ea753
  // Heavily edited by others
  it('keeps context when using waterfall() from async 1.5.2',
  function(done) {
    LoopBackContext.runInContext(function() {
      // Trigger async waterfall callbacks
      asyncV152.waterfall([
        function pushToContext(next) {
          var ctx = LoopBackContext.getCurrentContext();
          expect(ctx).is.an('object');
          ctx.set('test-key', 'test-value');
          next();
        },
        function pullFromContext(next) {
          var ctx = LoopBackContext.getCurrentContext();
          expect(ctx).is.an('object');
          var testValue = ctx && ctx.get('test-key', 'test-value');
          next(null, testValue);
        },
        function verify(testValue, next) {
          expect(testValue).to.equal('test-value');
          next();
        },
      ], done);
    });
  });
  it('handles concurrent then() calls with when v3.7.7 promises & bind option',
  function() {
    var timeout = 25;
    function runWithPushedValue(pushedValue, bind) {
      return new Promise(function concurrentExecution(outerResolve, reject) {
        LoopBackContext.runInContext(function pushToContext() {
          var ctx = LoopBackContext.getCurrentContext({bind: bind});
          expect(ctx).is.an('object');
          ctx.set('test-key', pushedValue);
          var whenPromise = whenV377.promise(function(resolve) {
            setTimeout(resolve, timeout);
          });
          whenPromise.then(function pullFromContextAndReturn() {
            var pulledValue = ctx && ctx.get('test-key');
            outerResolve({
              pulledValue: pulledValue,
              pushedValue: pushedValue,
            });
          }).catch(reject);
        });
      });
    }
    function getFailureCount(values) {
      var failureCount = 0;
      values.forEach(function(v) {
        if (v.pulledValue !== v.pushedValue) {
          failureCount++;
        }
      });
      return failureCount;
    }
    var successfulRun = Promise.all([
      runWithPushedValue('test-value-1', true),
      runWithPushedValue('test-value-2', true),
    ])
    .then(function verify(values) {
      var failureCount = getFailureCount(values);
      expect(failureCount).to.equal(0);
    });
    return successfulRun
    .then(function() {
      var maybeFailingRun = Promise.all([
        runWithPushedValue('test-value-3'),
        runWithPushedValue('test-value-4'),
      ])
      .then(function verify(values) {
        // Expect one of the two runners to fail, no matter which one
        var failureCount = getFailureCount(values);
        expect(failureCount).to.be.at.most(1);
      });
      return maybeFailingRun;
    });
  });
});
