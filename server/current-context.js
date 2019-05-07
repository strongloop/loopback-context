// Copyright IBM Corp. 2016,2017. All Rights Reserved.
// Node module: loopback-context
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var cls = require('cls-hooked');
var domain = require('domain');

var LoopBackContext = module.exports;

/**
 * Get the current context object. The context is preserved
 * across async calls, it behaves like a thread-local storage.
 *
 * @options {Object} [options]
 * @property {Boolean} bind Bind get/set/bind methods of the context to the
 * context that's current at the time getCurrentContext() is invoked. This
 * can be used to work around 3rd party code breaking CLS context propagation.
 * @returns {Namespace} The context object or null.
 */
LoopBackContext.getCurrentContext = function(options) {
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
    ns = cls.createNamespace(scopeName);
    process.context[scopeName] = ns;
    // Set up LoopBackContext.getCurrentContext()
    LoopBackContext.getCurrentContext = function(options) {
      if (!ns || !ns.active) {
        return null;
      }
      if (!options || !options.bind) {
        return ns;
      }
      /**
       * **NOTE**
       * This only re-binds get, set and bind methods, the most used.
       * If you use other methods of the context, e.g. runInContext(), etc.,
       * you may run into unexpected issues that are fixed only for get & set.
       */
      var boundContext = Object.create(ns);
      boundContext.get = boundContext.bind(ns.get);
      boundContext.set = boundContext.bind(ns.set);

      // Call to Function.prototype.bind(), not ns.bind()
      boundContext.bind = ns.bind.bind(ns);

      return boundContext;
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
