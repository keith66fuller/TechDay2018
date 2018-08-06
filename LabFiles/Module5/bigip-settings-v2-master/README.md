# bigip-settings-v2

[Original Documentation](https://devcentral.f5.com/wiki/DevOps.APIRef_bigip-settings_API.ashx)

This version of the worker will run without issue in the f5devcentral/f5-api-services-gateway container __or__ a BIG-IP device.
The original version was written prior to release of the container. The 'block' interface used in the worker would not properly
update when ran in the container.

## TBD

* Normalize with usage of configTaskUtil.js/remove as needed
* Adding configuration objects for VE onboarding

## Added Features (TBD)

* Networking configuration
  * VLANs
  * Trunks
  * Self-IPs
* Support BIG-IQ Licensing

## Notes

### Adding a device to the inventory

In the f5devcentral/f5-api-services-gateway container, devices added from passed in parameters (-e) will be found under:
__/mgmt/shared/resolver/device-groups/dockerContainers/__

Individual device selfLinks can be found under:
__/mgmt/shared/resolver/device-groups/dockerContainers/devices__

Adding a device after the container is already running (or to a BIG-IP) is accomplished by POSTing the to the 'devices' endpoint:

```json
{
    "userName": "admin",
    "password": "admin",
    "address": "{{big-ip}}",
    "httpsPort": 443
}
```

On a BIG-IP (ie. not in the container), the device-group will be:
__mgmt/shared/resolver/device-groups/tm-shared-all-big-ips__

```json
{
    "groupName": "tm-shared-all-big-ips",
    "devicesReference": {
        "link": "https://localhost/mgmt/shared/resolver/device-groups/tm-shared-all-big-ips/devices"
    },
    "autoManageLocalhost": true,
    "description": "BIG-IP HA Peer Group",
    "displayName": "HA Peer Group",
    "isViewGroup": false,
    "infrastructure": true,
    "generation": 1,
    "lastUpdateMicros": 1526502618981125,
    "kind": "shared:resolver:device-groups:devicegroupstate",
    "selfLink": "https://localhost/mgmt/shared/resolver/device-groups/tm-shared-all-big-ips"
}
```

You do not need to add 'localhost' to a BIG-IP device inventory (nor can you).

### Referencing that device

In your POST to the worker you can then reference a remote device by providing its selfLink:

```json
    "inputProperties": [
        {
            "id": "deviceReference",
            "type": "REFERENCE",
            "value": {
                "link": "https://localhost/mgmt/shared/resolver/device-groups/dockerContainers/devices/ce22224b-5fb5-403c-a580-9088e4664ec2"
            }
        },
    ...
```

If deploying on a BIG-IP you can reference the local device:

```json
    "inputProperties": [
        {
            "id": "deviceReference",
            "type": "REFERENCE",
            "value": {
                "link": "localhost"
            }
        },
```
