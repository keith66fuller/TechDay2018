/*
 * Copyright (c) 2013-2016, F5 Networks, Inc. All rights reserved.
 * No part of this software may be reproduced or transmitted in any
 * form or by any means, electronic or mechanical, for any purpose,
 * without express written permission of F5 Networks, Inc.
 */

"use strict";

var url = require("url");

var logger = require("f5-logger").getInstance();
var Q = require("q");

var BigIpDeviceProxy = require("./bigIpDeviceProxy");
var BigIpSettingsConfigTask = require("./bigIpSettingsConfigTask");

var LOG_PREFIX = "[BigIpSettingsConfigProcessor]: ";
var LICENSE_STATUS_LICENSING_NEED_EULA_ACCEPT = "LICENSING_NEED_EULA_ACCEPT";

/**
 * BIG-IP settings config processor. Deploys basic settings to BIG-IP devices. Can license a BIG-IP device. Can reset a BIG-IP device to default settings.
 *
 * @constructor
 * @augments RestWorker
 */
function BigIpSettingsConfigProcessor() { }

BigIpSettingsConfigProcessor.prototype.WORKER_URI_PATH = "shared/iapp/processors/bigip-settings-config";

/**
 * Called when the processor is being initialized
 * @param {function} onSuccess
 * @param {function} onError
 */
BigIpSettingsConfigProcessor.prototype.onStart = function (onSuccess, onError) {
    try {
        this.isPublic = true;
        this.apiStatus = this.API_STATUS.INTERNAL_ONLY;

        onSuccess();
    }
    catch (error) {
        logger.severe(LOG_PREFIX + "Failed to initialize config processor: " + error);
        if (onError) {
            onError(error);
        }
    }
};

/**
 * Called when a block instance is binding.
 * @param {RestOperation} restOperation
 */
BigIpSettingsConfigProcessor.prototype.onPost = function (restOperation) {
    logger.info(LOG_PREFIX + "onPost received");
    var self = this;
    self.basicAuthToken = restOperation.getBasicAuthorization();

    // Load config task
    var configTask;

    try {
        configTask = new BigIpSettingsConfigTask(restOperation, self);
    }
    catch (parseError) {
        restOperation.fail(parseError);
        logger.fine(LOG_PREFIX + "Error while parsing config task: " + parseError.message);
        return;
    }

    // Accept request
    this.completeRequest(restOperation, this.wellKnownPorts.STATUS_ACCEPTED);

    // Validate block
    var block;
    try {
        block = configTask.getBlock();
        logger.finest("Read block:\n" + JSON.stringify(block));
    }
    catch (validationError) {
        configTask.changeStateToError(validationError);
        return;
    }

    // Begin processing
    var targetDevice;

    // Initialize proxy for target device
    self.getDeviceProxy(block.inputProperties.deviceReference)
        .then(function (device) {
            // Store proxy for further reference
            targetDevice = device;
            return Q.resolve();
        })
        .then(function () {
            if (block.inputProperties.resetToDefaults) {
                // Load default configuration on target device
                return targetDevice.loadDefaultConfiguration()
                    .then(function () {
                        // Update block to reflect current (default) device settings
                        return self.getDeviceSettings(targetDevice, block);
                    });
            }
            else {
                // Not restoring to defaults. Push block settings to device instead.
                return self.setDeviceSettings(block, targetDevice)
                    .then(function () {
                        return targetDevice.saveConfiguration(); // Persist config
                    })
                    .then(function () {
                        if (block.inputProperties.license.baseRegKey) {
                            // License key provided. Begin license activation. (Will throw if EULA acceptance is required.)
                            return targetDevice.activateLicense(block.inputProperties.license)
                                .then(function (licenseText) {
                                    // Activation completed successfully. Register license.
                                    return targetDevice.registerLicense(licenseText);
                                });
                        }

                        // License key not provided.
                        return Q.resolve();
                    });
            }
        })
        .then(function () {
            configTask.updateBlock(block);
            configTask.changeStateToBound();
            logger.info(LOG_PREFIX + "onPost completed successfully.");
        })
        .catch(function (error) {
            switch (error.message) {
                case LICENSE_STATUS_LICENSING_NEED_EULA_ACCEPT:
                    // EULA acceptance required. Add EULA text to block and change state to ERROR
                    block.inputProperties.license.eulaText = error.eulaText;
                    block.inputProperties.license.acceptEula = false;
                    configTask.updateBlock(block);
                    configTask.changeStateToError(new Error("EULA acceptance required. Please set acceptEula to true to indicate you accept the End User License Agreement included in the eulaText field of the block."));
                    break;

                default:
                    configTask.changeStateToError(error);
                    break;
            }
        })
        .done();
};

BigIpSettingsConfigProcessor.prototype.onDelete = function (restOperation) {
    logger.fine(LOG_PREFIX + "onDelete received.");
    var self = this;

    var configTask;
    try {
        configTask = new BigIpSettingsConfigTask(restOperation, self);
    }
    catch (ex) {
        restOperation.fail(ex);
        return;
    }

    this.completeRequest(restOperation, this.wellKnownPorts.STATUS_ACCEPTED);

    configTask.changeStateToUnbound();
    logger.fine(LOG_PREFIX + "onDelete completed.");
};

/**
 * Generates a URI from components provided
 *
 * @param {string} host
 * @param {string} path
 * @param {string} query
 * @returns {url}
 */
BigIpSettingsConfigProcessor.prototype.generateUri = function(host, path, query) {
    var isLocal = (host === this.wellKnownPorts.LOCAL_HOST);
    return this.restHelper.buildUri({
        protocol: isLocal ? this.wellKnownPorts.DEFAULT_HTTP_SCHEME : this.wellKnownPorts.DEFAULT_HTTPS_SCHEME,
        port: isLocal ? this.wellKnownPorts.DEFAULT_JAVA_SERVER_PORT : this.wellKnownPorts.DEFAULT_HTTPS_PORT_NUMBER,
        hostname: host,
        path: path,
        query: query
    });
};

/**
 * Creates a proxy object for a local or remote BIG-IP device.
 *
 * @param {string} deviceReference - Remote device reference (link) or 'localhost' if self-referencing.
 *
 * @returns {Promise} - A promise that resolves to a BigIpDeviceProxy object
 */
BigIpSettingsConfigProcessor.prototype.getDeviceProxy = function (deviceReference) {
    logger.fine(LOG_PREFIX + "Creating device proxy from device reference.");

    var self = this;
    if (!deviceReference || !deviceReference.link) {
        throw new Error("Device reference must be provided and must include a link.");
    }

    if (deviceReference.link === this.wellKnownPorts.LOCAL_HOST) {
        logger.finest("Localhost reference received.");
        var localProxy = new BigIpDeviceProxy(deviceReference.link, null, self.basicAuthToken, self);
        logger.fine(LOG_PREFIX + "Local proxy created.");

        return Q.resolve(localProxy);
    }

    var deviceUri = url.parse(deviceReference.link);
    var requestUri = self.generateUri(this.wellKnownPorts.LOCAL_HOST, deviceUri.pathname, deviceUri.query);

    // Get basic information about the referenced remote device
    var restOp = this.restOperationFactory.createRestOperationInstance()
        .setMethod("Get")
        .setUri(requestUri)
        .setIsSetBasicAuthHeader(true)
        .setBasicAuthorization(self.basicAuthToken)
        .setReferer(self.getUri().href);

    return this.restRequestSender.send(restOp)
        .then(function (resp) {
            logger.finest(LOG_PREFIX + "Retrieved device information: " + JSON.stringify(resp.body));

            var remoteProxy = new BigIpDeviceProxy(resp.body.address, resp.body.groupName, null, self);
            logger.fine(LOG_PREFIX + "Remote proxy created.");
            return Q.resolve(remoteProxy);
        })
        .catch(function (error) {
            if (error.message.indexOf("URI path /" + deviceReference.link + "not registered.")) {
                throw new Error("'" + deviceReference.link + "' is not a valid device reference.");
            }

            throw error;
        });
};

/**
 * Updates the block to match actual settings of the target device
 *
 * @param {BigIpDeviceProxy} targetDevice - Device to read setting values from
 * @param {Object} output - Block structure to populate with data read from the device
 *
 * @returns {Promise} Promise that resolves to undefined on completion
 */
BigIpSettingsConfigProcessor.prototype.getDeviceSettings = function (targetDevice, output) {
    logger.fine(LOG_PREFIX + "Retrieving settings from target device.");

    var getSettingsTasks = [];
    getSettingsTasks.push(targetDevice.getGlobalSettings());
    getSettingsTasks.push(targetDevice.getNtpSettings());
    getSettingsTasks.push(targetDevice.getDnsSettings());
    getSettingsTasks.push(targetDevice.getSyslogSettings());

    return Q.all(getSettingsTasks)
        .spread(function (global, ntp, dns, syslog) {
            output.inputProperties.hostname = global.hostname;
            output.inputProperties.ntp.servers = ntp.servers;
            output.inputProperties.ntp.timezone = ntp.timezone;
            output.inputProperties.dns.servers = dns.servers;
            output.inputProperties.dns.search = dns.search;
            output.inputProperties.syslog.servers = syslog.servers;
        });
};

/**
 * Sets target device options to match the input parameters provided.
 *
 * @param {Object} inputBlock - Block with input properties
 * @param {BigIpDeviceProxy} targetDevice - Device to push the settings to
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpSettingsConfigProcessor.prototype.setDeviceSettings = function (inputBlock, targetDevice) {
    logger.fine("BigIpSettingsConfigProcessor: Updating device settings");

    var self = this;
    var getSettings = [
        targetDevice.getGlobalSettings(),
        targetDevice.getDnsSettings(),
        targetDevice.getNtpSettings(),
        targetDevice.getSyslogSettings()
    ];

    return Q.all(getSettings)
        .spread(function (currentGlobal, currentDns, currentNtp, currentSyslog) {
            var modifications = [];

            if (currentGlobal.hostname !== inputBlock.inputProperties.hostname) {
                var globals = {"hostname": inputBlock.inputProperties.hostname};
                modifications.push(targetDevice.updateGlobalSettings(globals)
                        .then(function () {
                            // Get current device name of target device
                            return self.getDeviceName(targetDevice);
                        })
                        .then(function (currentName) {
                            var targetName = inputBlock.inputProperties.hostname || "bigip1";
                            if (targetName === currentName) {
                                return Q.resolve();
                            }
                            return targetDevice.changeDeviceName(currentName, targetName);
                        })
                );
            }

            if (currentNtp.servers !== inputBlock.inputProperties.ntp.servers || currentNtp.timezone !== inputBlock.inputProperties.ntp.timezone) {
                modifications.push(targetDevice.setNtpSettings(inputBlock.inputProperties.ntp.servers, inputBlock.inputProperties.ntp.timezone));
            }

            if (currentDns.servers !== inputBlock.inputProperties.dns.servers || currentDns.search !== inputBlock.inputProperties.dns.search) {
                modifications.push(targetDevice.setDnsSettings(inputBlock.inputProperties.dns.servers, inputBlock.inputProperties.dns.search));
            }

            if (currentSyslog.servers !== inputBlock.inputProperties.syslog.servers) {
                modifications.push(targetDevice.setSyslogSettings(inputBlock.inputProperties.syslog.servers));
            }

            modifications.push(targetDevice.setSetupUtilityStatus(inputBlock.inputProperties.displaySetup));
            return Q.all(modifications);
        });
};

BigIpSettingsConfigProcessor.prototype.getDeviceName = function (targetDevice) {
    return targetDevice.getDeviceInfos()
        .then(function (infos) {
            var selfDevice = infos.find(function (e) {
                return e.selfDevice === "true";
            });
            return Q.resolve(selfDevice.name);
        });
};

module.exports = BigIpSettingsConfigProcessor;
