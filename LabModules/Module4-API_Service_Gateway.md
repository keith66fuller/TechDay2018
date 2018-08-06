
# Module 4 - API Service Container
### Task 0 - Lab Materials

SSH or open the web based shell to the 'Docker' host in the lab. You need to download the lab materials from the github repo for this class. 

```bash
$ git clone https://github.com/kreynoldsf5/TechDay2018.git
```

iControlLX is powered by, essentially, 2 service -- restjavad and restnoded. These services are available to run in a container without tmm/mcpd. The container is public available on the [docker hub](https://hub.docker.com/r/f5devcentral/f5-api-services-gateway/) and on [Github](https://github.com/f5devcentral/f5-rest-examples) with examples.



The container is close to parity to the iControlLX version running on BIG-IP. Extensions to be ran in the container will typically be calling out to one or more BIG-IP devices. Device trust is established by passing in variables at container runtime or adding/discovering device later. Although the same framework is in us(generally -- not the same version), some care must be taken to ensure that your worker will run in both a container and on a BIG-IP.

You would typically run the container with a command like:

```bash
$ docker run -p 8443:443 -p 8080:80 -e BIGIP_LIST='<user>:<password>:<mgmt-ip> <user>:<password>:<mgmt-ip>' f5devcentral/f5-api-services-gateway
```

This command specifies:
* _run_ a docker container
* Map port 8443 on the docker host to port 443 in the container 
* Map port 8080 on the docker host to port 80 on the container
* Pass in the _BIGIP_LIST_ variable
    * the value of the var is a space delimited list consisting of ```<user>:<password>:<mgmt-ip>```
* the container to run is _f5devcentral/f5-api-services-gateway_ from the public docker registry


### Task 1 - BIG-IP Trust

* Start an instance of the f5-api-services-gateway container specifying the BIG-IP list of your lab BIG-IP
 
```bash
$ docker run -d --rm -p 8443:443 -p 8080:80 -e BIGIP_LIST='admin:default:10.1.1.4' --name task1 f5devcentral/f5-api-services-gateway 
```

(-d runs the container in daemon mode, --rm removes the container when its stopped, --name sets the name for the running container)

* Verify your container is running with the expected values

```bash
$ docker ps
CONTAINER ID        IMAGE                                  COMMAND             CREATED             STATUS              PORTS                                         NAMES
a91cfcffdeb5        f5devcentral/f5-api-services-gateway   "/etc/runit/boot"   2 minutes ago       Up About a minute   0.0.0.0:8080->80/tcp, 0.0.0.0:8443->443/tcp   task1
```

* Shell into the container and view the _restnoded_ log.

```bash
$ docker exec -i -t task1 /bin/sh 
$ less /var/log/restnoded/restnoded.log
```

* Note the location of the log file (ie. its the same as on a BIG-IP)

* Find the log message re: making a secure connection to your BIG-IP device

### Task 2 - Big-IP Devices

* Check the device relationship for the previously discovered device
    * Send the 'Check discovered devices' GET request from the Module4(API Services Gateway Container) folder. 
    * Notice there are two devices there. Can you determine what the other device (ie. not the BIG-IP)?

* Remove the running container

```bash
$ docker stop task1
```

* Create a new container without passing in the BIG-IP device information

```bash
$ docker run -d --rm -p 8443:443 -p 8080:80 --name task2 f5devcentral/f5-api-services-gateway
```

* Send the 'Check discovered devices' request again from the collection.
* Look over the POST payload for the 'Create discovered device' request.
    * Send the request.
* Check the discovered devices again.
    * Note the UUID and selfLink of your discovered BIG-IP. Those will always be unique.




### Task 3 - adding a worker
iControlLX extensions are placed in the same directory as on a BIG-IP. Here is an example from a Dockerfile. A Dockerfile can be used to 'build' a specific container. 

```
FROM f5devcentral/f5-api-services-gateway

# Add Hello World endpoint to REST container
COPY ./src /var/config/rest/iapps/HelloWorldApp/
```
 
"FROM" specifies what base container is used in the build. "COPY" copies everything from the local "src" directory to a directory in the container. All workers in ```/var/config/rest/iapps/``` are built when the container starts.

* Change your current directory to the HelloWorldApp example

```bash
$ cd /TechDay2018/LabFiles/Module4/Task3/REST-HelloWorld/
```

* Build the container

```bash
$ docker build -t rest-helloworld .
```
 
* Run the container you just built.

```bash 
$ docker run -d --rm --name helloworld -p8443:443 rest-helloworld
```

(note that this container will be removed when its stopped due to the --rm flag)

* Shell into the container and watch the ```restnoded``` logs

```bash
$ docker exec -i -t task1 /bin/sh 
$ tail -f /var/log/restnoded/restnoded.log
```

* Make an https request to the worker endpoint. 
    * Send the 'Hello World' example from the Postman collection
    * Look closely at this request -- including Authorization and the headers being sent. Do you notice something interesting?

_Hint_
The analagous curl command would be:
```bash
curl -sk https://localhost:8443/mgmt/helloworld
```

* Stop the running container (it will be removed)

```bash
$ docker stop helloworld
```



### Task 4 - example GUI

The container has a newer version of the restnoded framework (the one that will be included in FlatRock). In this task we'll demonstrate a worker with a minimal GUI.

* Send the Postman requests for 'View Virtual Servers' and 'View Pools' to verify the BIG-IP has little to no config at this time. Look in the GUI if you prefer.

* On your Docker host ```cd``` to the directory needed for this task.

```bash
$ cd /TechDay2018/LabFiles/Module4/Task4/ip-address-expansion
```

* Build the container using the Dockerfile.

```bash
$ docker build -t ip-address-expansion .
```

* Run the container.

```bash
$ docker run -d --rm --name ip-expansion -p 8443:443 -e BIGIP_LIST='admin:admin:10.1.1.4' ip-address-expansion
```

* Verify the UI is available
    * From your browser on your Windows host browse to [https://10.1.1.6:8443/mgmt/shared/iapp/ipAddressExpansion/presentation](https://10.1.1.6:8443/mgmt/shared/iapp/ipAddressExpansion/presentation).

* Add a virtual IP and port and then click 'Add'.

* Use the same Postman requests as before to verify the BIG-IP objects were created.

__This is obviously just an example -- the worker only polls BIG-IP state when it starts.__

* Stop the container.

```bash
$ docker stop ip-address-expansion
```


### Task 5 - mounting a directory

With the 'volume' flag, docker allows you to mount a local host directory to a directory inside the container. Since the container is going to install all workers in the ```/var/config/rest/iapps/``` and ```/root/lx``` directories when it starts, we can keep our workers stored locally. 

* Run the container mapping a local directory to a volume.

```bash
$ docker run -d --rm -p 8443:443 -p 8080:80 -v /TechDay2018/LabFiles/Module4/Task5/:/root/lx/ -e BIGIP_LIST='admin:default:10.1.1.4' --name task5 f5devcentral/f5-api-services-gateway 
```

* Shell into the container and ```tail``` the ```restnoded``` log.

```bash
$ docker exec -i -t task5 /bin/sh 
$ tail -f /var/log/restnoded/restnoded.log
```

* Verify the two workers from the directory started.
    * REST-Helloworld
    * hello-planet


### Task 6 - HelloPlanet, take 2

With the updated ```restnoded``` framework, we have some new tools at our disposal. There are now a couple of worker types we can use which can simplify some of our tasks. This version of the ```hello-planet``` worker uses the Singleton pattern.

Look at ```PlanetWorker.js``` from this folder in your text editor. It is substantially different than the previous version.

```javascript
class PlanetWorker {
    constructor() {
        this.WORKER_URI_PATH = '/Planet';
        this.isPersisted = true;
        this.isPublic = true;
        this.isSingleton = true;
    }

    /**
     * Return default state of document
     *
     * @returns {Object|Promise} default state at startup
     * @memberof PlanetWorker
     */
    getDefaultState() {
        return {
            planet: "Earth"
        };
    }

    /**
     * Return odata schema for document
     *
     * @returns {Object}
     * @memberof PlanetWorker
     */
    getSchema() {
        return {
            name: 'Planet',
            key: {
                propertyRefs: [{ name: 'planet' }]
            },
            properties: [
                { name: 'planet', type: 'Edm.String', nullable: false}
            ]
        };
    }
}

module.exports = PlanetWorker;
```

By specifying ```isSingleton = true``` and defining a couple functions we dictate an odata schema for our data. Think of this Singleton pattern as a global namespace where we know there is only on instance of our object. We can define the schema to a set of keys specifies the [odata primitive type](http://docs.oasis-open.org/odata/odata-json-format/v4.01/cs01/odata-json-format-v4.01-cs01.html#sec_PrimitiveValue) for the key. 

We no longer have to provided data type error checking or methods of interacting with the endpoint. 

* Run through the Postman requests in the Task6 folder. 
    * the goal here is understand how we can now interact with the Singleton worker.


Extra Credit: Change the EDM (Entity Data Model) type for the planet property and create additional properties. Look in the [f5-rest-examples](https://github.com/f5devcentral/f5-rest-examples/tree/master/workers/singletons) repository for more examples.

Extra Extra Credit: Can you update the hello-planet worker running on the BIG-IP (installed in Module3) to call the 'planet' worker running in your container? Remember that you won't need authentication for this request.
