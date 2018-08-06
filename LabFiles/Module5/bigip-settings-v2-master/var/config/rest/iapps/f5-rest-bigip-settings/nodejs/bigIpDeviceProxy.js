/*
 * Copyright (c) 2013-2016, F5 Networks, Inc. All rights reserved.
 * No part of this software may be reproduced or transmitted in any
 * form or by any means, electronic or mechanical, for any purpose,
 * without express written permission of F5 Networks, Inc.
 */

"use strict";

var Q = require("q");
var BigIpEndpoints = require("./bigIpEndpoints");
var logger = require("f5-logger").getInstance();
var packageUtils = require("./packageUtils");

var LOG_PREFIX = "[BigIpDeviceProxy]: ";

var SYSLOG_DEFAULT_PORT = 514;
var LICENSE_STATUS_MAX_RETRIES = 30;
var LICENSE_STATUS_POLL_INTERVAL = 5000;
var LICENSE_STATUS_LICENSING_ACTIVATION_IN_PROGRESS = "LICENSING_ACTIVATION_IN_PROGRESS";
var LICENSE_STATUS_LICENSING_COMPLETE = "LICENSING_COMPLETE";
var LICENSE_STATUS_NEED_EULA_ACCEPT = "NEED_EULA_ACCEPT";
var LICENSE_STATUS_LICENSING_NEED_EULA_ACCEPT = "LICENSING_NEED_EULA_ACCEPT";

/**
 * Proxy for a BIG-IP device.
 *
 * @param {RestWorker} parent - Parent worker. The proxy inherits REST request infrastructure from the worker.
 * @param {string} address - Address of the device
 * @param {string|null} [group] - Device group the device belongs to. Optional if localhost.
 * @param {string|null} authHeader - Auth header used for basic auth calls to the device. Optional if remote.
 * @property {Object} restHelper - Inherited from parent worker
 * @property {Object} wellKnownPorts - Inherited from parent worker
 * @property {string} parentUri - URI of the parent worker. Used to set referrer URIs on outgoing REST calls to the device.
 * @property {string} deviceGroup - Inherited from parent worker
 * @property {string} address - Address of the device represented by the proxy
 * @property {Object} restRequestSender - Inherited from parent worker
 *
 * @constructor
 */
function BigIpDeviceProxy(address, group, authHeader, parent) {
    this.restHelper = parent.restHelper;
    this.restOperationFactory = parent.restOperationFactory;
    this.wellKnownPorts = parent.wellKnownPorts;
    this.parentUri = parent.getUri().href;
    this.deviceGroup = group;
    this.authHeader = authHeader;
    this.address = address;
    this.restRequestSender = parent.restRequestSender;
}

/**
 * Generates an options object for REST requests.
 * An options object contains a referrer Uri and an optional body
 * @param {Object} [body] - Optional request body
 * @returns {{referrer: string, body: *}}
 */
BigIpDeviceProxy.prototype.buildRequestOptions = function (body) {
    return {
        referrer: this.parentUri,
        body: body
    };
};

/**
 * Generate URI based on individual elements (host, path, query).
 *
 * @param {string} host IP address or FQDN of a target host
 * @param {string} path Path on a target host
 * @param {string} query Query string
 *
 * @returns {url} Object representing resulting URI.
 */
BigIpDeviceProxy.prototype.generateURI = function (host, path, query) {
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
 * Creates a new rest operation instance. Sets the method, target uri and (optionally) referrer and body
 *
 * @param {string} method HTTP verb
 * @param {url} uri Target URI
 * @param {Object} [options] Request options
 * @param {string} [options.referrer] Optional referrer
 * @param {Object} [options.body] Optional request body
 *
 * @returns {RestOperation}
 */
BigIpDeviceProxy.prototype.createRestOperation = function (method, uri, options) {
    var restOp = this.restOperationFactory.createRestOperationInstance()
        .setMethod(method)
        .setUri(uri);

    if (options && options.referrer) {
        restOp.setReferer(options.referrer);
    }

    if (options && options.body) {
        restOp.setBody(options.body);
    }

    return restOp;
};

/**
 * Make an identified device REST call to the specified uri.
 *
 * @param {string} method - HTTP verb
 * @param {string} path - URI path
 * @param {string} [query] - Optional query string
 * @param {Object} [body] - Optional request body
 *
 * @returns {Promise} A promise that will resolve to the response
 */
BigIpDeviceProxy.prototype.callUsingTrust = function (method, path, query, body) {
    var options = this.buildRequestOptions(body);
    var uri = this.generateURI(this.address, path, query || "");

    var restOp = this.createRestOperation(method, uri, options);
    restOp.setIdentifiedDeviceRequest(true);
    restOp.setIdentifiedDeviceGroupName(this.deviceGroup);

    logger.finer(LOG_PREFIX + "Identified device REST operation ready for dispatch: " + JSON.stringify(restOp));

    return this.restRequestSender.send(restOp);
};

/**
 * Make a basic auth REST call to the specified uri.
 *
 * @param {string} method - HTTP verb
 * @param {string} path - URI path
 * @param {string} [query] - Optional query string
 * @param {Object} [body] - Optional request body
 *
 * @returns {Promise} A promise that will resolve to the response
 */
BigIpDeviceProxy.prototype.callUsingBasicAuth = function (method, path, query, body) {
    var options = this.buildRequestOptions(body);
    var uri = this.generateURI(this.address, path, query || "");

    var restOp = this.createRestOperation(method, uri, options);
    restOp.setBasicAuthorization(this.authHeader);
    restOp.setIsSetBasicAuthHeader(true);

    logger.finer(LOG_PREFIX + "Basic auth device REST operation ready for dispatch: " + JSON.stringify(restOp));

    return this.restRequestSender.send(restOp);
};

/**
 * Call device using either basic auth or identified device call
 *
 * @param {string} method - HTTP verb
 * @param {string} path - URI path
 * @param {string} [query] - Optional query string
 * @param {Object} [body] - Optional request body
 *
 * @returns {Promise} A promise that will resolve to the response
 */
BigIpDeviceProxy.prototype.call = function (method, path, query, body) {
    if (this.address === this.wellKnownPorts.LOCAL_HOST) {
        return this.callUsingBasicAuth(method, path, query, body);
    }
    else {
        return this.callUsingTrust(method, path, query, body);
    }
};

/**
 * Loads default configuration on the device
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.loadDefaultConfiguration = function () {
    logger.fine(LOG_PREFIX + "Loading default configuration.");

    var body = {"command": "load"};

    return this.call("Post", BigIpEndpoints.URI_SYSTEM_CONFIGURATION, "options=default", body)
        .then (function () {
            return Q.resolve();
        });
};

/**
 * Retrieves global settings from the device
 *
 * @returns {Promise} - Promise that will resolve to an object representing global settings
 */
BigIpDeviceProxy.prototype.getGlobalSettings = function () {
    logger.fine(LOG_PREFIX + "Retrieving global settings");

    return this.call("Get", BigIpEndpoints.URI_GLOBAL_SETTINGS)
        .then(function (response) {
            return response.body;
        });
};

/**
 * Retrieves NTP settings of the device
 *
 * @returns {Promise} - Promise that will resolve to an object representing NTP settings
 */
BigIpDeviceProxy.prototype.getNtpSettings = function () {
    logger.fine(LOG_PREFIX + "Retrieving NTP settings");

    return this.call("Get", BigIpEndpoints.URI_NTP_SETTINGS)
        .then(function (response) {
            return response.body;
        });
};

/**
 * Retrieves DNS settings of the device
 *
 * @returns {Promise} - Promise that resolves to an object representing DNS settings
 */
BigIpDeviceProxy.prototype.getDnsSettings = function () {
    logger.fine(LOG_PREFIX + "Retrieving DNS settings");

    return this.call("Get", BigIpEndpoints.URI_DNS_SETTINGS)
        .then(function (response) {
            return response.body;
        });

};

/**
 * Retrieves remote log server settings
 *
 * @returns {Promise} - Promise that resolves to an object representing syslog settings
 */
BigIpDeviceProxy.prototype.getSyslogSettings = function () {
    logger.fine(LOG_PREFIX + "Retrieving Syslog settings");

    return this.call("Get", BigIpEndpoints.URI_SYSLOG_SETTINGS)
        .then(function (response) {
            return response.body;
        });
};

/**
 * Activates a license on the device
 *
 * @param {String} baseRegKey
 * @param {String[]} addOnKeys
 * @param {String} dossier
 * @param {String} [eulaText]
 * @param {boolean} [acceptEula]
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.activateLicense = function (licenseInfo) {
    var self = this;
    logger.fine(LOG_PREFIX + "Activating license.");
    logger.fine("DBG: Lic data:" + JSON.stringify(licenseInfo));
    var body = {
        "baseRegKey": licenseInfo.baseRegKey,
        "isAutomaticActivation": true
    };

    if (licenseInfo.dossier) {
        body.dossier = licenseInfo.dossier;
    }

    if (licenseInfo.addOnKeys && licenseInfo.addOnKeys.length > 0) {
        body.addOnKeys = licenseInfo.addOnKeys;
    }

    if (licenseInfo.eulaText && licenseInfo.acceptEula) {
        body.eulaText = licenseInfo.eulaText;
    }

    return self.call("Post", BigIpEndpoints.URI_LICENSE_ACTIVATION, "", body)
        .then(function (response) {
            if (response.body.status === "LICENSING_ACTIVATION_IN_PROGRESS") {
                logger.fine(LOG_PREFIX + "License successfully submitted for activation");
                return Q.resolve();
            }

            var errorMsg = "Failure occurred on submission of license for activation. Response status: " + response.body.status;
            return Q.reject(new Error(errorMsg));
        })
        .then(function () {
            // Wait until license activation finishes
            return packageUtils.repeatWhile(self.getLicenseActivationStatus.bind(self), function (result) {
                return (result.status === LICENSE_STATUS_LICENSING_ACTIVATION_IN_PROGRESS);
            }, LICENSE_STATUS_MAX_RETRIES, LICENSE_STATUS_POLL_INTERVAL);
        })
        .then(function (result) {
            // Check the result of license activation
            switch (result.status) {
                case LICENSE_STATUS_LICENSING_COMPLETE:
                    logger.fine(LOG_PREFIX + "License activation complete. EULA acceptance not required.");
                    return Q.resolve(result.licenseText);

                case LICENSE_STATUS_NEED_EULA_ACCEPT:
                case LICENSE_STATUS_LICENSING_NEED_EULA_ACCEPT:
                    logger.fine(LOG_PREFIX + "License activation complete. EULA acceptance is required.");
                    var err = new Error(LICENSE_STATUS_LICENSING_NEED_EULA_ACCEPT);
                    err.eulaText = result.eulaText;
                    throw err;

                default:
                    var errorMsg = "Failure occurred while activating license: " + result.errorText || JSON.stringify(result);
                    throw new Error(errorMsg);
            }
        });
    };

/**
 * Registers a license on the device
 *
 * @param {String} licenseText - Text of the license
 *
 * @returns {Promise} that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.registerLicense = function(licenseText) {
    logger.fine(LOG_PREFIX + "Registering license.");

    var self = this;

    var body = { "licenseText": licenseText };
    return self.call("Put", BigIpEndpoints.URI_LICENSE_REGISTRATION, "", body)
        .then(function(result) {
            if (result.body.vendor === "F5 Networks, Inc.") {
                return Q.resolve();
            }

            logger.finest("Body received: " + JSON.stringify(result.body));

            return Q.reject(new Error("License registration failed."));
        });
};

/**
 * Retrieves status of license activation process
 *
 * @returns {Promise} - Promise that resolves to an object representing the status
 */
BigIpDeviceProxy.prototype.getLicenseActivationStatus = function() {
    logger.fine(LOG_PREFIX + "Retrieving license registration status");

    return this.call("Get", BigIpEndpoints.URI_LICENSE_ACTIVATION)
        .then(function (response) {
            return Q.resolve(response.body);
        });
};

/**
 * Modifies the global settings of the device
 *
 * @param {Object} settings - New setting values
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.updateGlobalSettings = function(settings) {
    logger.fine(LOG_PREFIX + "Updating global settings");

    return this.call("Patch", BigIpEndpoints.URI_GLOBAL_SETTINGS, "", settings)
        .then(function () {
            return Q.resolve();
        })
        .catch(function (error) {
            logger.fine("Error while setting hostname: " + error);
            throw new Error("Unable to set the hostname. Make sure the hostname value is a fully qualified domain name.");
        });
};

/**
 * Modifies the FQDN of the device
 * @param {String} from - Current FQDN
 * @param {String} to - Target FQDN
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.changeDeviceName = function(from, to) {
    logger.fine(LOG_PREFIX + "Updating device name from '" + from + "' to '" + to + "'.");

    var body = {
        "command": "mv",
        "name": from,
        "target": to
    };

    return this.call("Post", BigIpEndpoints.URI_DEVICE_NAME, "", body)
        .then(function () {
            return Q.resolve();
        });
};

/**
 * Retrieves device information
 * @returns {Promise} A promise that resolves to an array of devie info objects
 */
BigIpDeviceProxy.prototype.getDeviceInfos = function() {
    logger.fine(LOG_PREFIX + "Retrieving device information");

    return this.call("Get", BigIpEndpoints.URI_DEVICE_NAME, "")
        .then(function(response) {
            return Q.resolve(response.body.items);
        });
};

/**
 * Modifies NTP settings on the device
 *
 * @param {String[]} servers - NTP server IP addresses
 * @param {String} timezone - Timezone id
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.setNtpSettings = function(servers, timezone) {
    logger.fine(LOG_PREFIX + "Updating NTP settings.");

    var body = {
        "servers": servers,
        "timezone": timezone || "America/Los_Angeles"
    };

    return this.call("Put", BigIpEndpoints.URI_NTP_SETTINGS, "", body)
        .then(function () {
                return Q.resolve();
            },
            function (error) {
                if (error.message.indexOf("is not a valid time zone") !== -1) {
                    throw new Error("Invalid timezone designator.");
                }
                throw error;
            }
        );
};

/**
 * Modifies DNS settings on the device
 *
 * @param {String[]} servers - DNS server IP addresses
 * @param {String[]} search - Search domains
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.setDnsSettings = function(servers, search) {
    logger.fine(LOG_PREFIX + "Updating DNS settings.");

    var body = {
        "nameServers": servers,
        "search": search
    };

    return this.call("Patch", BigIpEndpoints.URI_DNS_SETTINGS, "", body)
        .then(function () {
                return Q.resolve();
            },
            function (error) {
                if (error.message.indexOf("invalid IP address") !== -1) {
                    throw new Error("DNS server list contains an invalid IP address.");
                }
                throw error;
            }
        );
};

/**
 * Modifies syslog server settings on the device
 *
 * @param {String[]} servers - Array of syslog server IP addresses, optionally followed by port numbers
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.setSyslogSettings = function (servers) {
    logger.fine(LOG_PREFIX + "Updating Syslog settings.");

    var body = {
        "remoteServers": servers ? servers.map(function (server) {
            var array = server.split(":");
            var host = array[0];
            var port;
            try {
                port = array.length > 1 ? parseInt(array[1]) : SYSLOG_DEFAULT_PORT;
            } catch (error) {
                logger.fine(array[1] + " is not an integer, setting syslog port to default " + SYSLOG_DEFAULT_PORT);
                port = SYSLOG_DEFAULT_PORT;
            }
            return {
                "name": host,
                "host": host,
                "remotePort": port
            };
        })
        : []
    };

    return this.call("Patch", BigIpEndpoints.URI_SYSLOG_SETTINGS, "", body)
        .then(function () {
            return Q.resolve();
        }, function (error) {
            if (error.message.indexOf("invalid or ambiguous service") !== -1) {
                throw new Error("Syslog server list contains an invalid hostname or port.");
            }
            throw error;
        });
};

/**
 * Sets the flag indicating whether the Setup Utility will be executed on the device on next login.
 *
 * @param {boolean} status - Indicates whether the Setup Utility should be executed
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.setSetupUtilityStatus = function(status) {
    logger.fine(LOG_PREFIX + "Updating the Setup Utility flag to " + status);

    var body = {
        "value": status
    };

    return this.call("Put", BigIpEndpoints.URI_SETUP_UTILITY_STATUS, "", body)
        .then(function () {
            return Q.resolve();
        });
};

/**
 * Saves device configuration
 *
 * @returns {Promise} - Promise that resolves to undefined on completion
 */
BigIpDeviceProxy.prototype.saveConfiguration = function () {
    logger.fine(LOG_PREFIX + "Saving configuration.");

    var body = {"eager": false};

    return this.call("Post", BigIpEndpoints.URI_SAVE_CONFIGURATION, "", body)
        .then(function () {
            return Q.resolve();
        });
};

module.exports = BigIpDeviceProxy;
