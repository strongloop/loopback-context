// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var LoopBackContext = module.exports;

LoopBackContext.getCurrentContext = function() {
  return null;
};

LoopBackContext.runInContext =
LoopBackContext.createContext = function() {
  throw new Error('Current context is not supported in the browser.');
};
