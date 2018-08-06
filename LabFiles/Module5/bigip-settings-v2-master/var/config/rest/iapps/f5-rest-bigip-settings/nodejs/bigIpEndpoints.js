/*
 * Copyright (c) 2013-2016, F5 Networks, Inc. All rights reserved.
 * No part of this software may be reproduced or transmitted in any
 * form or by any means, electronic or mechanical, for any purpose,
 * without express written permission of F5 Networks, Inc.
 */

"use strict";

var bigIpEndpoints = {
    "URI_SYSTEM_CONFIGURATION": "/mgmt/tm/sys/config",
    "URI_GLOBAL_SETTINGS":  "/mgmt/tm/sys/global-settings",
    "URI_DNS_SETTINGS":  "/mgmt/tm/sys/dns",
    "URI_NTP_SETTINGS": "/mgmt/tm/sys/ntp",
    "URI_SYSLOG_SETTINGS": "/mgmt/tm/sys/syslog",
    "URI_LICENSE_ACTIVATION": "/mgmt/tm/shared/licensing/activation",
    "URI_LICENSE_REGISTRATION": "/mgmt/tm/shared/licensing/registration",
    "URI_DEVICE_NAME": "/mgmt/tm/cm/device",
    "URI_SETUP_UTILITY_STATUS": "/mgmt/tm/sys/db/setup.run",
    "URI_SAVE_CONFIGURATION": "/mgmt/shared/save-config"
};

module.exports = bigIpEndpoints;
