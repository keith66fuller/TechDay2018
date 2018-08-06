# Module 1: Build and Install iCLX RPM


## Extension creation
iControlLX extensions need to be created and packaged in an RPM format prior to being installed. Packages can be created on one BIG-IP (or API gateway container) and installed on another device.  

Sample iControlLX extensions are provided in the repository:
  * helloWorld.js - obligatory first extension
  * skeletonWorker.js - event framework outline example

### Task1 - build HelloWorld.js extension
* Make the directory from which the extension will be built on your Big-IP device. SSH to your Big-IP device and drop to bash.


```bash
mkdir -p /var/config/rest/iapps/HelloWorld/nodejs
```

* SCP the JavaScript files to the build directory.
  * Use winSCP on the windows jump host or SCP from the docker host to cp {{repo}}/LabFiles/Module1/helloWorld.js to the build directory

 
* Obtain the admin token and the user token for this Lab. Open the _Module1_ directory in the Postman collection. Browse to the _Token Auth_ directory. 
    * Walk through the requests in the _Admin_ and the _User_ directories. 
    * Verify the {{bigip1_admin_token}} and {{bigip1_user_token}} Postman environment variables are populated.


* Browse to the "Task 1: Build RPM" folder of the "Module1" directory.


* Set/verify the Postman environment variable {{extension_name}} is set to the build directory name (just the directory name -- not the full path) you created earlier -- "HelloWorld" in this case.


* Send the 'Create RPM on Big-IP' request. This procedure follows the 'tasks' pattern (the initial ```status``` will be "CREATED").


* Send the 'Check RPM Creation Process' request. Notice the URL ends with the ```id``` from the 'Create' task. Evaluate the ```step``` and ```status``` values from this request.

* On your Big-IP, look in the directory specified in ```packageDirectory``` in the last response to verify your RPM was created (if the status was 'FINISHED' it should be there). The iControlLX extension is now built and packaged. This RPM can be installed on this device or another BIG-IP device or REST proxy container.

### Task 2: Extension installation
iControlLX extensions must be installed from ```/var/config/rest/downloads/```. Not coincidently, this is the same directory used by the iControl [file upload endpoint](https://devcentral.f5.com/wiki/iControl.File_transfer_resource_APIs.ashx). You can POST to https://{{F5-Device}}/mgmt/shared/file-transfer/uploads/{{filename}} with the appropriate body and headers (chunking dependent) to upload a file via iControl REST. For this lab, since we're installing on the same machine where we're building, just cp the RPM by hand.

* Copy the RPM from ```packageDirectory``` to this directory.

This can done from the BIG-IP:

```bash 
cp /var/config/rest/iapps/RPMS/HelloWorld-0.1-001.noarch.rpm /var/config/rest/downloads/
```

_or_

Send the request for "Move RPM to install directory" Postman request.


* Inspect the POST body of the 'Install RPM' request. Look at your Postman environment variables to see the value of {{rpm_name}}. 
    * (Look back at the 'Test' tab from the "Create RPM on Big-IP" request to see how this variable was built). 

* Monitor the relevant Big-IP log while the RPM build procedure is performed.
 
```bash
tailf /var/log/restnoded/restnoded.log
```

* Send the _Install RPM_ request.
    * Did you see a relevant log message in /var/log/restnoded/restnoded.log?
    * What directory did your extension get installed to? Make a note of this for later.

* Verify the install status by sending the _Check RPM install process status_ request.

* If you need to uninstall a package use the requests in the 'Delete RPM' folder.

* Open 'helloWorld.js' in your text editor. Find the ```WORKER_URI_PATH```. 

* Open your web browser to https://{{bigip1_mgmt}}/mgmt/{{WORKER_URI_PATH}} . What is the result?

