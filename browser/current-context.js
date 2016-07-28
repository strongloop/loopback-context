// Copyright IBM Corp. 2015. All Rights Reserved.
// Node module: loopback-context-cls
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var ClsContext = module.exports;

ClsContext.getCurrentContext = function() {
  return null;
};

ClsContext.runInContext =
ClsContext.createContext = function() {
  throw new Error('Current context is not supported in the browser.');
};
