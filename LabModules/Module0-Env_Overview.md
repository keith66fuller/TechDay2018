# Module 0

Start your deployment from [here](https://udf.f5.com/b/e160ac9a-f752-4e45-801f-7279fcf1e9d9#documentation).

## Environment Overview

This Lab assumes a working knowledge of the following:
- iControl REST API
- Use of Postman in interact with RESTful APIs
- BIG-IP LTM concepts
- Some basic understanding of JavaScript (we'll keep this light)

## Environment Layout
The UDF hosted Lab environment consists of two BIG-IP devices (TMOS 13.1), an ubuntu server (16.04 LTS) running docker, and a Window jump host. All tools needed for the lab can be found on the Windows jump host (putty, winSCP, Postman, Visual Studio Code, etc.). The Lab consists of a Management network and a Traffic network. 

|               | Management | Traffic |
| ------------- |:-----------:|:----------:|
| bip1.td2018.local | 10.1.1.4     | 10.1.10.4 | 
| Windows            | 10.1.1.5     | 10.1.10.5 | 
| Docker           | 10.1.1.6     | 10.1.10.6 | 


The BIG-IPs are using default credentials. For the Windows and Docker host use ```student/student```.

**Please go ahead and start the deployment now as the F5 devices will take some time (5-6 min) to boot.**

## Preliminary Tasks
### Log into your Windows Jump Host
1. Grab an RDP link from the UDF link.
  * Log in with "student/student".
2. Open Chrome and download the ['kreynoldsf5/TechDay2018'](https://github.com/kreynoldsf5/TechDay2018.git) repository. This repo contains all the materials needed for the lab.
  * Download the repository as unzip it on the desktop.
  * View the Lab Guides under the 'LabModules' directory. These are all in markdown and will display nicely on Github. 
  * Feel free to clone the repo locally (instead of on the Windows jump host) if that's easier.
3. Verify Access to your other Lab devices.
    * TMUI and SSH access are needed for the BIG-IP device.
    * SSH access is needed to the ubuntu/docker device.
 

### Postman
If you're not familiar with Postman let me know and we'll spend a few minutes covering the tool.

1. Import the Postman Environment and collection from the repo (/TechDay2018/LabFiles/).
3. Note the use of variable substitution using the {{variable}} nomenclature.

### Visual Studio Code
I've included a decent editor/IDE for viewing/editing javascript files -- Visual Studio Code. Feel free to use whatever editor you are comfortable with.
