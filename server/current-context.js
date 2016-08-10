// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var domain = require('domain');

// Require CLS only when using the current context feature.
// As soon as this require is done, all the instrumentation/patching
// of async-listener is fired which is not ideal.
//
// Some users observed stack overflows due to promise instrumentation
// and other people have seen similar things:
//   https://github.com/othiym23/async-listener/issues/57
// It all goes away when instrumentation is disabled.
var cls = function() {
  return require('continuation-local-storage');
};

var LoopBackContext = module.exports;

/**
 * Get the current context object. The context is preserved
 * across async calls, it behaves like a thread-local storage.
 *
 * @returns {Namespace} The context object or null.
 */
LoopBackContext.getCurrentContext = function() {
  // A placeholder method, see LoopBackContext.createContext() for the real version
  return null;
};

/**
 * Run the given function in such way that
 * `LoopBackContext.getCurrentContext` returns the
 * provided context object.
 *
 * **NOTE**
 *
 * The method is supported on the server only, it does not work
 * in the browser at the moment.
 *
 * @param {Function} fn The function to run, it will receive arguments
 * (currentContext, currentDomain).
 * @param {Namespace} context An optional context object.
 *   When no value is provided, then the default global context is used.
 */
LoopBackContext.runInContext = function(fn, context) {
  var currentDomain = domain.create();
  currentDomain.oldBind = currentDomain.bind;
  currentDomain.bind = function(callback, context) {
    return currentDomain.oldBind(ns.bind(callback, context), context);
  };

  var ns = context || LoopBackContext.createContext('loopback');

  currentDomain.run(function() {
    ns.run(function executeInContext(context) {
      fn(ns, currentDomain);
    });
  });
};

/**
 * Create a new LoopBackContext instance that can be used
 * for `LoopBackContext.runInContext`.
 *
 * **NOTES**
 *
 * At the moment, `LoopBackContext.getCurrentContext` supports
 * a single global context instance only. If you call `createContext()`
 * multiple times, `getCurrentContext` will return the last context
 * created.
 *
 * The method is supported on the server only, it does not work
 * in the browser at the moment.
 *
 * @param {String} scopeName An optional scope name.
 * @return {Namespace} The new context object.
 */
LoopBackContext.createContext = function(scopeName) {
  // Make the namespace globally visible via the process.context property
  process.context = process.context || {};
  var ns = process.context[scopeName];
  if (!ns) {
    ns = cls().createNamespace(scopeName);
    process.context[scopeName] = ns;
    // Set up LoopBackContext.getCurrentContext()
    LoopBackContext.getCurrentContext = function() {
      return ns && ns.active ? ns : null;
    };
  }
  return ns;
};

/**
 * Create middleware that sets up a new context for each incoming HTTP request.
 *
 * See perRequestContextFactory for more details.
 */
LoopBackContext.perRequest = require('./middleware/per-request');
