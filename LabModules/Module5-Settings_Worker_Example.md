## Big-IP Settings Worker

* ```cd``` to the provided build directory.

```bash 
$ cd /Techday2018-master/LabFiles/Module5/bigip-settings-v2-master
```

* Build the container needed for the exercise.

```bash
$ docker build -t bigip-settings .
```

* Start the container.

```bash
$ docker run -d --rm --name bigip-settings -p 8443:443 -e BIGIP_LIST='admin:admin:10.1.1.4' bigip-settings
```

* Let the container start. Verify the worker started. 

```bash
$ docker exec -i -t bigip-settings /bin/sh 
$ tail -f /var/log/restnoded/restnoded.log
```

* Send the "Retrieve Example Instance Block" request from the Postman collection.
    * notice the filter used in the URI for this request. 
        * This is the same location for all blocks on the system.
        * We are filtering on ```state``` and ```name```.

* Send the "Find discovered devices" Postman request.
    * We need to determine the ```deviceReference``` for the block of config we want to deploy in the next steps.
    * Look at the 'test' associated with that request to see how we are searching for that value.


* Edit the POST payload for the 'Deploy Provisioning Task'.
    * After clicking on the request, click on the 'Body' button under the URL bar.
    * If desired, change the ```hostname```, ```ntp```, and ```dns``` sections of the payload.
        * Even properties that the ConfigProcessor that will not change need to be defined (and left blank).

* On the BIG-IP, watch the ```restjavad``` audit log.

```bash
$ tail -f /var/log/restjavad-audit.0.log
```

* Send the 'Deploy Provisioning Task' request.

* Verify the request succeeded by sending the 'Check Provisioning Status' Postman request.
    * When the state is 'BOUND' the ConfigProcessor is complete.
    * Notice that the ```name``` and a ```id``` value.
        * ```name``` does not have to be unique for the block.

* Send the 'Reset Device to Factory Defaults' request (while still tailing the restjavad audit log). Here is the important bit of the payload: 

```javascript
    {
        "id": "resetToDefaults",
        "type": "BOOLEAN",
        "value": true
    }
```

* Send the 'Check Reset Task Status' request to verify the status of the block (```"state": "BOUND"```).
    * This request might take 10-20 seconds to fire.  
    * What is the hostname of your BIG-IP now?
* Log into the TMUI of your Big-IP. What state is the box in?

* Send the 'View 'BOUND' blocks' request and look at the blocks stored there.
    * The blocks just store state for ConfigProcessor tasks.  
    * This means we could restore a previous state described in that block.


* Send the 'Redeploy the original block' request.
    * This is _just_ a Patch to the first block changing its state to "BINDING".
* Log into your BIG-IP again. What state is the box in now?


There is a similiar worker, using the same block interface and ConfigProcessor pattern, for Device Service Clustering. What other tasks might we want handled in a similiar fashion?






