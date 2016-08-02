// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var domain = require('domain');
var requireOptional = require('optional');
var deprecated = require('depd')('loopback');

// Require CLS only when using the current context feature.
// As soon as this require is done, all the instrumentation/patching
// of async-listener is fired which is not ideal.
//
// Some users observed stack overflows due to promise instrumentation
// and other people have seen similar things:
//   https://github.com/othiym23/async-listener/issues/57
// It all goes away when instrumentation is disabled.
var _isClsRequired = false;
var cls = function() {
  var clsHooked = requireOptional('cls-hooked');
  if (!clsHooked) {
    // optional dependency not met
    if (!_isClsRequired) {
      // show deprecation warning only once
      deprecated('loopback.getCurrentContext() is deprecated, due to issues ' +
      'with continuation-local storage libraries, mostly with Node versions ' +
      'less than 4.5, or between 5.0 and 5.10 (see async-hook for details). ' +
      'Either upgrade Node to a version outside of these ranges and ' +
      'reinstall cls-hooked locally, or see ' +
      'https://docs.strongloop.com/display/APIC/Using%20current%20context ' +
      'for more details. If you already upgraded Node, maybe this warning is ' +
      'only because cls-hooked failed to install for some reason.');
      _isClsRequired = true;
    }
    // fallback to legacy module
    return require('continuation-local-storage');
  } else {
    return clsHooked;
  }
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
