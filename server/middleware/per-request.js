// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var LoopBackContext = require('../current-context');

module.exports = perRequestContextFactory;

var name = 'loopback';

/**
 * Context middleware.
 * ```js
 * var perRequestContext = require(
 *   'loopback-context/server/middleware/per-request-context.js');
 * var app = loopback();
 * app.use(perRequestContext(options);
 * app.use(loopback.rest());
 * app.listen();
 * ```
 * @options {Object} [options] Options for context
 * @property {String} name Context scope name.
 * @property {Boolean} enableHttpContext Whether HTTP context is enabled. Default is false.
 */

function perRequestContextFactory(options) {
  options = options || {};
  var scope = options.name || name;
  var enableHttpContext = options.enableHttpContext || false;
  var ns = LoopBackContext.createContext(scope);

  // Return the middleware
  return function perRequestContext(req, res, next) {
    if (req.loopbackContext) {
      return next();
    }

    LoopBackContext.runInContext(function processRequestInContext(ns, domain) {
      req.loopbackContext = ns;

      // Bind req/res event emitters to the given namespace
      ns.bindEmitter(req);
      ns.bindEmitter(res);

      // Add req/res event emitters to the current domain
      domain.add(req);
      domain.add(res);

      // Run the code in the context of the namespace
      if (enableHttpContext) {
        // Set up the transport context
        ns.set('http', {req: req, res: res});
      }
      next();
    });
  };
}
