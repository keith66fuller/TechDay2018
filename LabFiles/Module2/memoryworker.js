/*
 * Copyright (c) 2018, F5 Networks, Inc. All rights reserved.
 * No part of this software may be reproduced or transmitted in any
 * form or by any means, electronic or mechanical, for any purpose,
 * without express written permission of F5 Networks, Inc.
 */

/**
 * @class MemoryWorker
 * @mixes RestWorker
 *
 * @description A simple worker that outlines functions that
 * can be defined and when and how they are called
 *
 * Called when the worker is loaded from disk and first
 * instantiated by the @LoaderWorker
 * @constructor
 */
function MemoryWorker() {
    this.state = {};
}

/**
 * @required
 * @description The uri key registered to handle incoming requests
 * The url can be accessed on localhost at http://localhost:8105/WORKER_URI_PATH
 * or at http://host/mgmt/WORKER_URI_PATH if the worker is public
 * @type {string}
 */
MemoryWorker.prototype.WORKER_URI_PATH = "shared/memory";

/**
 * @optional
 * @description specified if the worker is available off box.
 * adds a dependency to /forwarder worker
 * @default false
 * @type {boolean}
 */
MemoryWorker.prototype.isPublic = true;

/**
 * @optional
 * @description specifies the F5 API LifeCycle state for the extension. The default is NO_STATUS.
 * @type {string}
 */
MemoryWorker.prototype.apiStatus = "GA";


/******************
 * startup events *
 ******************/

/**
 * @optional
 *
 * @description onStart is called after the worker has been loaded and mixed
 * in with RestWorker. You would typically implement this function if you needed
 * to verify 3rd party dependencies exist before continuing to load your worker.
 *
 * @param {Function} success callback in case of success
 * @param {Function} error callback in case of error
 */
MemoryWorker.prototype.onStart = function(success, error) {

    //if the logic in your onStart implementation encounters and error
    //then call the error callback function, otherwise call the success callback
    var err = false;
    if (err) {
        this.logger.severe("MemoryWorker onStart error: something went wrong");
        error();
    } else {
        this.logger.info("MemoryWorker onStart success");
        success();
    }
};

/**
 * @optional
 *
 * @description onStartCompleted is called after the dependencies are available
 * and state has been loaded from storage if worker is persisted with
 * isStateRequiredOnStart set to true. Framework will mark this worker available
 * to handle requests after success callback is called.
 *
 * @param {Function} success callback in case of success
 * @param {Function} error callback in case of error
 * @param {Object} state object loaded from storage
 * @param {Object|null} errMsg error from loading state from storage
 */
MemoryWorker.prototype.onStartCompleted = function(success, error, state, errMsg) {
    if (errMsg) {
        this.logger.severe("MemoryWorker onStartCompleted error: something went wrong " + errMsg);
        error();
        return;
    }

    this.logger.info("MemoryWorker state loaded: " + JSON.stringify(state));
    success();
};

/*****************
 * http handlers *
 *****************/

/**
 * @optional
 * @description handle onGet HTTP request
 * @param {Object} restOperation
 */
MemoryWorker.prototype.onGet = function(restOperation) {
    // Set the version number variable
    var o = {};
    o.version = "1";


    // Add the persisted "Data" attribute to the response object
    o.Data = this.state.Data;

    // Send a message to the logging system
    this.logger.info("current version is " + o.version);
    // Set the response payload to the prepared object
    restOperation.setBody(o);
    // complete the REST operation and return control to the caller
    this.completeRestOperation(restOperation);
};

/**
 * @optional
 * @description handle onPost HTTP request
 * @param {Object} restOperation
 */
MemoryWorker.prototype.onPost = function(restOperation) {
    // Access the Data attribute in the POST body
    var newData = restOperation.getBody().Data;
    // Store the value of Data in the state's Data attribute
    this.state.Data = newData;
    // Complete the PUT operation
    this.completeRestOperation(restOperation);
};

/**
 * @optional
 * @description handle onPut HTTP request
 * @param {Object} restOperation
 */
MemoryWorker.prototype.onPut = function(restOperation) {
    // Access the Data attribute in the POST body
    var newData = restOperation.getBody().Data;
    // Store the value of Data in the state's Data attribute
    this.state.Data = newData;
    // Complete the PUT operation
    this.completeRestOperation(restOperation);
};


/**
 * @optional
 * @description handle onPatch HTTP request
 * @param {Object} restOperation
 */
MemoryWorker.prototype.onPatch = function(restOperation) {
    restOperation.fail(new Error("PATCH not supported"));
};


/**
 * @optional
 * @description handle onDelete HTTP request
 * @param {Object} restOperation
 */
MemoryWorker.prototype.onDelete = function(restOperation) {
    this.state = {};
    this.completeRestOperation(restOperation.setBody(this.state));
};

/********************
 * Helper Functions *
 ********************/

/**
 * @optional
 * @description Get example model for this REST resource
 * @returns {Object} object model example
 */
MemoryWorker.prototype.getExampleState = function() {
    return { "version": "1.1", "Data": data }
};


module.exports = MemoryWorker;