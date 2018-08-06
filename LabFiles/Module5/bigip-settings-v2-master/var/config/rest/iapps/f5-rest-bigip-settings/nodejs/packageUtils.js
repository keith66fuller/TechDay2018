/*
 * Copyright (c) 2013-2016, F5 Networks, Inc. All rights reserved.
 * No part of this software may be reproduced or transmitted in any
 * form or by any means, electronic or mechanical, for any purpose,
 * without express written permission of F5 Networks, Inc.
 */
"use strict";

var Q = require("q");
var logger = require("f5-logger").getInstance();

var packageUtils = {
    /**
     *
     * @param {function} what - Function to be repeatedly executed. Must return a promise.
     * @param {function} condition - Function that accepts the result of 'what' and returns a boolean that indicates if 'what' should be repeated.
     * @param {number} attempts - Max retries
     * @param {number} interval - Interval between retries, in milliseconds
     * @returns {Promise} - Promise that resolves to the result of 'what'
     */
    repeatWhile: function (what, condition, attempts, interval) {
        var self = this;

        if (attempts <= 0) {
            return Q.reject(new Error("Reached maximum attempts. Aborting."));
        }
        logger.fine(attempts + " attemtps remaining.");

        return what().then(function (result) {
            if (!condition(result)) {
                return Q.resolve(result);
            }
            else {
                attempts -= 1;
                return Q.delay(interval)
                    .then(function () {
                        return self.repeatWhile(what, condition, attempts, interval);
                    });
            }
        });
    }
};


module.exports = packageUtils;