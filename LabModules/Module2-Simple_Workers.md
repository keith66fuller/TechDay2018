# Module 2 -- Debugging, Events, and RBAC #
### Task 1: Debug/update an installed worker
__This procedure is only suitable for Dev/POC systems. You would never want to do this on a BIG-IP with production traffic/iCLX workers.__

* Note where the _HelloWorld_ worker was deployed from the previous module. 
    * This should be in ```/var/config/rest/iapps/HelloWorld/nodejs/helloWorld.js```

* Change your worker to return a different message in the _onGet_ event (hint: edit line 13). 
    * You can do this using _vim_ on the Big-IP or using a text editor and then SCPing the _HelloWorld.js_ to the appropiate folder.
    * In order for _restnoded_ to register your change the service will need to be restarted. One way to do this is through tmsh.
    
```bash 
tmsh restart sys service restnoded
```
* Verify your worker was updated by sending an appropiate GET request.

* Change your worker to register at a different *WORKER_URI_PATH* (hint: look at line 6).
    * We will need to restart the _restnoded_ service again. I've included a request to do this in the _Task1: Debug Workflow_ directory under _Module2_. 

* Verify that your updated worker responds at the correct _WORKER_URI_PATH_ using a web browser.

Note that you wouldn't want to do this procedure on a production system.

Concepts: Anatomy of a worker, updating a worker, registering those changes in restnoded.



### Task 2: Build/Install the MemoryWorker.js extension
* Using the steps in Task 1 and Task 2 from Module 1, build and install the memoryworker.js iControl extension. 
  * Copy the extension from the /TechDay2018/LabFiles/Module2/ folder in the repo to the build directory on the Big-IP device.
  * Update the {{extension_name}} Postman environment variable.
  * Build the RPM with the correct request.
  * Copy the RPM to the installation directory.
  * Install the RPM with the correct request.
 
* Look at the contents of the ```onPost``` event. What do you think the POST payload for this worker needs to look like?
  
```javascript
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
```
Remember that ```restOperation``` is both the incoming request and the response. The ```getBody()``` method returns the POST body and ```.Data``` refers to a JSON property.

* Look at the contents of the ```onGet``` event. What is the response to a GET going to look like?

```javascript
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
```
* From the 'Task 2' folder send the GET example and note the response.
* From the 'Task 2' folder send the example POST _Memoryworker example POST_.
* Send the example GET with 'Memoryworker Example GET', and note the response.
* Change the persisted data by updating the previous POST request. What HTTP methods are available? Why doesn't the version increment? 

* Restart _restnoded_. What is the value of _Data_ now?

Additional Task (for those familiar with javascript): Update the worker so that the Version is incremented with each POST.

Hints:
* _int_ can be incremented with _int++_
* _int_ is not a string. the _.toString()_ method is available.
* _onStart_ fires only when the extension is loaded by restnoded. This is a little like _rule_init_.

An example solution can be found in /TechDay2018/LabFiles/Module2/memoryworker_version.js.

Concepts: persisted data (through the life of restnoded process), POST payload parsing, ```restOperation``` in practice.


### Task 3: iControlLX RBAC 

In the previous exercises, we made requests to iControlLX extension URIs using the Big-IP admin token. Commonly, less priviledged users will need to make requests to the worker endpoints (ie. automation systems).

* Send the _View Permissions for 'student' user_ request.
    * There is no shell. 
    * This user was created as a _guest_ -- it has read only permissions.

* Send the _View role permissions_ request. 
    * Glance over the roles here.
    * Notice how there is an _iControl_REST_API_User_ role that the 'student' user was automatically added to. That role doesn't have _resources_ assigned directly to it. Instead, it has a _resourceGroupReference_.
    
* Send the _View resource-group for iCR role_ request. 
    * This is showing you the resources assigned to the _iControl_REST_API_User_ role.
    * There are two ways to assign resources (Mask, and restMethod) to a role. Explicitly, or inherited through a _resource-group_. 
    * Note that we could also add these resources directly to the _shared-authz-users-student_ role which was created when the 'student' account was created. For this example, we want to create a role that could be usable by many different accounts. 
    
* Send the _Create iCLX Role for Memory Worker_ request.
    * Look at the POST response. Notice the _userReferences_ section and the _resources_ section.

* Test GET and POST requests to the iControlLX extension. 
    * Why did your POST fail?
    * Can you fix your role permissions before looking at the _Update Role Permissions_ PATCH request?

* Test permissions against the iControlLX extension after fixing and after _Delete dedicated iCLX Role_.

Concepts: RBAC for iControl REST as applied to iControlLX.
