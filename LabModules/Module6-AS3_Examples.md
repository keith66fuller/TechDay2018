### Task 1 - Create Docker Pool Members
Start several docker pool members based on the F5Devcentral/F5-Demo-App container. 
1. Either SSH to the docker host or use the 'Application SSH Shell' link from the UDF 'Access' drop down.
2. run ```for i in {1..5}; do docker run -d -P f5devcentral/f5-demo-app; done```. Each iteration in the ```for``` loop will create a new container bound to a different host port.
3. run ```docker ps``` and make a note of the assigned ports for these containers.

The results should look something like:
```
$ docker ps
CONTAINER ID        IMAGE                                  COMMAND             CREATED             STATUS              PORTS                                         NAMES
2234d5a7f041        f5devcentral/f5-demo-app               "npm start"         5 seconds ago       Up 4 seconds        0.0.0.0:32777->80/tcp                         wonderful_banach
4bf55c8808d5        f5devcentral/f5-demo-app               "npm start"         6 seconds ago       Up 5 seconds        0.0.0.0:32776->80/tcp                         musing_fermi
898f7eed0eb5        f5devcentral/f5-demo-app               "npm start"         7 seconds ago       Up 5 seconds        0.0.0.0:32775->80/tcp                         hopeful_meninsky
855ca4d9f29f        f5devcentral/f5-demo-app               "npm start"         8 seconds ago       Up 6 seconds        0.0.0.0:32774->80/tcp                         wonderful_mayer
3090e5d2a88d        f5devcentral/f5-demo-app               "npm start"         8 seconds ago       Up 7 seconds        0.0.0.0:32773->80/tcp                         awesome_agnesi
```
In this example the pool members' ports will be 32777 through 32773.

### Task 2 - Install AS3

AS3 is an iControlLX extension. It can be installed in a similiar manner as the iControlLX extensions we've been dealing with so far. The github repo for the project is located [here](https://github.com/F5Networks/f5-appsvcs-extension).

You already enabled LX package management back in Module3. You can install the AS3 through that interface after grabbing the RPM from the project repo.

Alternatively, I've included a completely RESTful way to install the RPM in the 'Install AS3 RPM' Postman Folder.

After installation, run the 'AS3 selftest' request to verify the worker is functional.


### Task3 - Example Declarations

I've included several declarations (which are basically the examples from the current AS3 documentation). The declaration schema is unique -- certianly a departure from previous tooling. As you review the [overview](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/3/refguide/understanding-the-json-schema.html#), keep in mind classes were designed to use industry standard terms as opposed to BIG-IP specific terms. The complete schema reference can be [here](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/3/refguide/schema-reference.html).

Run through the 'Declaration Examples' folder. Look at the ```remark``` in each request for a description of the declaration (HTTP with SSL, Perf L4, etc). Then look through the JSON payload referencing the various classes with the configuration that gets built.

Some notes on the included requests:
* The ```"action": "dry-run"``` acts as a declaration sanity check.
* AS3 infers several defaults if not specified. "Sample1 - view defaults" demonstrates this.
* AS3 only stores the last 4 declarations used by default (this is configurable but in your payload).
* Look how easy it is to delete all the tenants.



### Task4 - Build a Working Declaration
Now that you have potential pool members (the f5-demo-app containers), build a working declaration. For reference, read through the [composing a declaration](https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/3/userguide/composing-a-declaration.html) article from the AS3 documentation. 

Note the following format (which varies from all the examples) for defining the pool needed due to our pool members having different service ports:

```javascript
 "members": [
     {
           "servicePort": 32777,
           "serverAddresses": [
             "10.1.10.6"
         ]
     },
     {
           "servicePort": 32776,
           "serverAddresses": [
             "10.1.10.6"
         ]
     }
 ]
 ```

* Test your declaration with the 'Dry-run' request and then use the 'Deploy' request.

* Test your virtual server in a [browser](http://10.0.10.14).