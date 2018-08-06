# Install the RPM

This process is used for iControlLX worker installation on a BIG-IP. Directions "appropriated" from the [iControlLX Wiki](https://devcentral.f5.com/wiki/iControlLX.HowToSamples_deploy_icontrol_extension.ashx).

Copy the provided RPM to the /var/config/rest/downloads directory on the BIG-IP. This allows the REST framework to detect it.

Once copied, you may now execute the ‘INSTALL’ command via the iControl REST API.

```bash
curl -u user:pass -X POST http://localhost:8100/mgmt/shared/iapp/package-management-tasks -d '{ "operation":"INSTALL","packageFilePath": "/var/config/rest/downloads/MemoryWorker-0.1.0-0001.noarch.rpm"}'
```

You should receive a response similar to the following:

```json
{
  "packageFilePath": "/var/config/rest/iapps/downloads/MemoryWorker-0.1.0-0001.noarch.rpm",
  "operation": "INSTALL",
  "selfLink": "https://localhost/mgmt/shared/iapp/package-management-tasks/a9646643-2639-4116-8cd8-bfe72b54209b"
}
```

 As is with the creation process, the install task is asynchronous. The INSTALL operation will create this async task and you can check the status by using a HTTP GET request with curl on the selfLink field.

```bash
curl -k -u user:pass  https://localhost/mgmt/shared/package-management-tasks/a9646643-2639-4116-8cd8-bfe72b54209b
```

Repeat this process until a status of “FINISHED” is returned.

```json
{
  "packageFilePath": "/var/config/rest/downloads/MemoryWorker-0.1.0-0001.noarch.rpm",
  "packageName": "MemoryWorker-0.1.0-0001.noarch",
  "operation": "INSTALL",
  "status": "FINISHED",
  "selfLink": "https://localhost/mgmt/shared/package-management-tasks/a9646643-2639-4116-8cd8-bfe72b54209b"
}
```

The new extension will be operational now and you can issue a REST request  to ensure it is functioning as expected.