/*
 * Copyright (c) 2013-2016, F5 Networks, Inc. All rights reserved.
 * No part of this software may be reproduced or transmitted in any
 * form or by any means, electronic or mechanical, for any purpose,
 * without express written permission of F5 Networks, Inc.
 */

"use strict";
var Url = require("url");

var logger = require("f5-logger").getInstance();
var Block = require("./block");
var BlockUtil = require("./blockUtil");

/**
 * Initializes a new instance from a rest operation
 * @param {RestOperation} restOp
 * @param {RestWorker} parent
 *
 * @constructor
 */
function BigIpSettingsConfigTask(restOp, parent) {
    if (!restOp) {
        throw new Error("Rest operation not provided.");
    }

    if (!parent) {
        throw new Error("Parent worker not provided.");
    }

    this.parent = parent;
    BlockUtil.initialize({ restUtil: this.parent.restUtil});
    var body = restOp.getBody();
    if (!body || !body.selfLink) {
        throw new Error("The request does not contain a body, or the body is missing a selfLink.");
    }

    if (!body.block || !body.block.id) {
        throw new Error("The request body does not contain a block, or the block is missing an id.");
    }

    this.body = body;
}

BigIpSettingsConfigTask.prototype.updateBlock = function(values) {
    var findPropertyById = function (propCollection, id) {
        return propCollection.find(function (e) {
            return e.id === id;
        });
    };
    var inputProperties = this.body.block.inputProperties;
    findPropertyById(inputProperties, "displaySetup").value = values.inputProperties.displaySetup;
    findPropertyById(inputProperties, "resetToDefaults").value = values.inputProperties.resetToDefaults;
    findPropertyById(inputProperties, "hostname").value = values.inputProperties.hostname;
    findPropertyById(inputProperties, "deviceReference").value = values.inputProperties.deviceReference;

    var ntp = findPropertyById(inputProperties, "ntp");
    if (ntp) {
        findPropertyById(ntp.value, "servers").value = values.inputProperties.ntp.servers;
        findPropertyById(ntp.value, "timezone").value = values.inputProperties.ntp.timezone;
    }

    var dns = findPropertyById(inputProperties, "dns");
    if (dns) {
        findPropertyById(dns.value, "servers").value = values.inputProperties.dns.servers;
        findPropertyById(dns.value, "search").value = values.inputProperties.dns.search;
    }

    var syslog = findPropertyById(inputProperties, "syslog");
    if (syslog) {
        findPropertyById(syslog.value, "servers").value = values.inputProperties.syslog.servers;
    }

    var license = findPropertyById(inputProperties, "license");
    if (license) {
        findPropertyById(license.value, "baseRegKey").value = values.inputProperties.license.baseRegKey;
        findPropertyById(license.value, "addOnKeys").value = values.inputProperties.license.addOnKeys;
        findPropertyById(license.value, "dossier").value = values.inputProperties.license.dossier;
        findPropertyById(license.value, "eulaText").value = values.inputProperties.license.eulaText;
        findPropertyById(license.value, "acceptEula").value = values.inputProperties.license.acceptEula;
    }
};

BigIpSettingsConfigTask.prototype.getBlock = function () {
    var inputProperties = {};
    var inputMap = BlockUtil.getMapFromPropertiesAndValidate(this.body.block.inputProperties, ["hostname", "dns", "syslog", "ntp", "deviceReference", "resetToDefaults", "displaySetup"]);

    inputProperties.displaySetup = inputMap.displaySetup.value;
    inputProperties.resetToDefaults = inputMap.resetToDefaults.value;
    inputProperties.hostname = inputMap.hostname.value;

    inputProperties.deviceReference = inputMap.deviceReference.value;
    if (!inputProperties.deviceReference.link) {
        throw new Error("Device reference link must be provided.");
    }

    inputProperties.ntp = {
        servers: inputMap.ntp.servers.value,
        timezone: inputMap.ntp.timezone.value
    };

    inputProperties.dns = {
        servers: inputMap.dns.servers.value,
        search: inputMap.dns.search.value
    };

    inputProperties.syslog = {
        servers: inputMap.syslog.servers.value
    };

    inputProperties.license = {

        baseRegKey: inputMap.license.baseRegKey.value,
        addOnKeys: inputMap.license.addOnKeys.value,
        dossier: inputMap.license.dossier.value,
        eulaText: inputMap.license.eulaText.value,
        acceptEula: inputMap.license.acceptEula.value
    };

    return {
        inputProperties: inputProperties
    };
};

/**
 * Update block configuration task on error
 *
 * @param {Error} error - Error information
 * @param {boolean} [inclStack=false] - Indicates whether error stack should be included in the error message. False by default.
 */
BigIpSettingsConfigTask.prototype.changeStateToError = function (error, inclStack) {
    logger.fine("Patching block to ERROR state with the following error: " + error);

    var op = this.createPatchOperation(this.body.selfLink, this.parent.getUri().href).setBody({
        "subStatus": "UPDATE_BLOCK_WITH_RESPONSE",
        "block": {
            "state": Block.state.ERROR,
            "error": error.message + (inclStack ? "\n    Error stack:\n" + error.stack : ""),
            "inputProperties": this.body.block.inputProperties,
            "dataProperties": this.body.block.dataProperties
        }
    });
    this.parent.eventChannel.emit(this.parent.eventChannel.e.sendRestOperation, op);
};

/**
 * Update block configuration task on successful creation of configuration
 */
BigIpSettingsConfigTask.prototype.changeStateToBound = function () {
    logger.fine("Patching block to BOUND state.");
    var op = this.createPatchOperation(this.body.selfLink, this.parent.getUri().href).setBody({
        "subStatus": "UPDATE_BLOCK_WITH_RESPONSE",
        "block": {
            "state": Block.state.BOUND,
            "inputProperties": this.body.block.inputProperties,
            "dataProperties": this.body.block.dataProperties
        }
    });
    this.parent.eventChannel.emit(this.parent.eventChannel.e.sendRestOperation, op);
};

/**
 * Update block configuration task on successful deletion of configuration
 */
BigIpSettingsConfigTask.prototype.changeStateToUnbound = function () {
    var op = this.createPatchOperation(this.body.selfLink, this.parent.getUri().href).setBody({
        "subStatus": "UPDATE_BLOCK_WITH_RESPONSE",
        "block": {
            "state": Block.state.UNBOUND,
            "inputProperties": this.body.block.inputProperties,
            "dataProperties": this.body.block.dataProperties
        }
    });

    this.parent.eventChannel.emit(this.parent.eventChannel.e.sendRestOperation, op);
};

/**
 * Create an instance of RestOperation and sets the referrer to self and method to PATCH
 * @param selfLink selfLink of icrd object
 * @param referrer referrer uri string
 * @return {*}
 */
BigIpSettingsConfigTask.prototype.createPatchOperation = function (selfLink, referrer) {
    var blockConfigTaskUriPathname = Url.parse(selfLink).pathname;
    var localBlockConfigTaskUri = this.parent.restHelper.makeRestjavadUri(blockConfigTaskUriPathname, null, false);

    return this.parent.restOperationFactory.createRestOperationInstance()
        .setReferer(referrer)
        .setMethod("Patch")
        .setUri(localBlockConfigTaskUri)
        .setIdentifiedDeviceRequest(true);
};

module.exports = BigIpSettingsConfigTask;
