# Build the Container

The repo contains a Dockerfile for building a container with this iControlLX worker.

```bash
docker build -t bigipsettingsv2 .
docker run -d --rm --name exampleBigipSettingsV2 -p 8443:443 -e BIGIP_LIST='admin:admin:{{bigip}}' bigipsettingsv2
```

You can then look at the _restnoded_ logs to make sure the worker started without issue.

```bash
$ docker exec -i -t exampleBigipSettingsV2 /bin/sh -c 'tail -f /var/log/restnoded/restnoded.log'
Wed, 30 May 2018 12:53:45 GMT - fine: [DockerDeviceSetupWorker] Getting device info for  {{bigip}}
Wed, 30 May 2018 12:53:45 GMT - fine: [DockerDeviceSetupWorker] Cleaning up trust group on device  {{bigip}}
Wed, 30 May 2018 12:53:45 GMT - fine: [DockerDeviceSetupWorker] Cleaning up old certificates on device  {{bigip}}
Wed, 30 May 2018 12:53:45 GMT - fine: [DockerDeviceSetupWorker] Establishing trust with {{bigip}}:443
Wed, 30 May 2018 12:53:48 GMT - config: [RestWorker] /shared/nodejs/dockerDeviceSetup has started. Name:DockerDeviceSetupWorker
Wed, 30 May 2018 12:53:48 GMT - info: [DockerDeviceSetupWorker] scriptFilePath: /usr/share/rest/node/src/workers/dockerDeviceSetupWorker.js
Wed, 30 May 2018 12:53:50 GMT - config: [RestWorker] /shared/nodejs/dockerLoader has started. Name:DockerLoadWorker
Wed, 30 May 2018 12:53:50 GMT - fine: [dockerLoader] scriptFilePath: /usr/share/rest/node/src/workers/dockerLoadWorker.js
Wed, 30 May 2018 12:53:50 GMT - config: [RestWorker] /shared/iapp/processors/bigip-settings-config has started. Name:BigIpSettingsConfigProcessor
Wed, 30 May 2018 12:53:50 GMT - info: starting /shared/iapp/processors/bigip-settings-config
```

The container is now ready to accept POST payloads to the block interface to configure a device.

## Adding a BIG-IP while the container is runing

```bash
curl -k https://localhost:8443/mgmt/shared/resolver/device-groups/dockerContainers/devices -H "content-type:application/json" -d '{ "userName": "admin", "password": "admin", "address": "{{bigip}}", "httpsPort": 443 }'
```
