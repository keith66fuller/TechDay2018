/*
  Copyright (c) 2017, F5 Networks, Inc.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  *
  http://www.apache.org/licenses/LICENSE-2.0
  *
  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
  either express or implied. See the License for the specific
  language governing permissions and limitations under the License.
*/

"use strict";


class PlanetWorker {
    constructor() {
        this.WORKER_URI_PATH = '/Planet';
        this.isPersisted = true;
        this.isPublic = true;
        this.isStateRequiredOnStart = true;
    }

    onStartCompleted(success, error, state, errMsg) {
        this.state = state;
        success();
    }

    onGet(restOperation) {
        var oThis = this;

        if (!this.state.planet) {
            restOperation.setBody(this.state);
            this.completeRestOperation(restOperation);
            return;
        }

        this.loadState(null,
            function (err, state) {
                if (err) {
                    restOperation.fail(err);
                    return;
                }
                restOperation.setBody(state);
                oThis.completeRestOperation(restOperation);
            }
        );
    }

    onPost(restOperation) {
        var newPlanet = restOperation.getBody().planet;
        this.state.planet = newPlanet;
        this.completeRestOperation(restOperation);
    }

    onPut(restOperation) {
        var newPlanet = restOperation.getBody().planet;
        this.state.planet = newPlanet;
        this.completeRestOperation(restOperation);
    }

    onPatch(restOperation) {
        var newPlanet = restOperation.getBody().planet;
        this.state.planet = newPlanet;
        this.completeRestOperation(restOperation);
    }

    onDelete(restOperation) {
        this.state = {};
        this.completeRestOperation(restOperation.setBody(this.state));
    }

}

module.exports = PlanetWorker;