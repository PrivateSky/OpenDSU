const mappingRegistry = require("./mappingRegistry.js");
const apisRegistry = require("./apisRegistry.js");
const errMap = require("./errorsMap.js")

//loading defaultApis
require("./defaultApis");

//loading defaultMappings
require("./defaultMappings");

function MappingEngine(storageService, options) {
  if (typeof storageService === "undefined"
    || typeof storageService.beginBatch !== "function"
    || typeof storageService.commitBatch !== "function"
    || typeof storageService.cancelBatch !== "function") {
    throw Error("The MappingEngine requires a storage service that exposes beginBatch, commitBatch, cancelBatch apis!");
  }

  const errorHandler = require("opendsu").loadApi("error");

  //the purpose of the method is to create a "this" instance to be used during a message mapping process
  function buildMappingInstance() {
    let instance = {storageService, options};
    const apis = apisRegistry.getApis();

    //we inject all the registered apis on the instance that will become the "this" for a mapping
    for (let prop in apis) {
      if (typeof instance[prop] !== "undefined") {
        console.log(`Take note that an overwriting processing is in place for the api named ${prop}.`);
      }
      instance[prop] = (...args) => {
        return apis[prop].call(instance, ...args);
      }
    }

    return instance;
  }

  async function getMappingFunction(message) {
    const knownMappings = mappingRegistry.getMappings();

    for (let i = 0; i < knownMappings.length; i++) {
      let mapping = knownMappings[i];
      let {matchFunction, mappingFunction} = mapping;
      let applyMapping = await matchFunction(message);

      if (applyMapping) {
        return mappingFunction;
      }
    }
  }

  function commitMapping(mappingInstance) {
    let touchedDSUs = mappingInstance.registeredDSUs;
    return new Promise((resolve, reject) => {
      //if all good until this point, we need to commit any registeredDSU during the message mapping
      const commitPromises = [];
      for (let i = 0; i < touchedDSUs.length; i++) {
        const commitBatch = $$.promisify(touchedDSUs[i].commitBatch);
        commitPromises.push(commitBatch());
      }

      Promise.all(commitPromises)
        .then(async results => {
            for (let i = 0; i < results.length; i++) {
              let result = results[i];
              if (result && result.status === "rejected") {
                await $$.promisify(touchedDSUs[i].cancelBatch)();
                let getDSUIdentifier = $$.promisify(touchedDSUs[i].getKeySSIAsString);
                return reject(errorHandler.createOpenDSUErrorWrapper(`Cancel batch on dsu identified with ${await getDSUIdentifier()}`, error));
              }
            }
            resolve(true);
          }
        ).catch(err => {
        return reject(errorHandler.createOpenDSUErrorWrapper(`Caught error during commit batch on registered DSUs`, err));
      });
    });
  }

  function executeMappingFor(message) {
    return new Promise(async (resolve, reject) => {

      const mappingFnc = await getMappingFunction(message);
      if (mappingFnc) {
        const instance = buildMappingInstance();
        try {
          await mappingFnc.call(instance, message);
        } catch (err) {
          //we need to return the list of touched DSUs for partial rollback procedure
          err.mappingInstance = {registeredDSUs: instance.registeredDSUs};
          return reject(err);
        }
        return resolve({registeredDSUs: instance.registeredDSUs});
      } else {
        let messageString = JSON.stringify(message);
        const maxDisplayLength = 1024;
        console.log(`Unable to find a suitable mapping to handle the following message: ${messageString.length < maxDisplayLength ? messageString : messageString.slice(0, maxDisplayLength) + "..."}`);
        return reject(errMap.newCustomError(errMap.errorTypes.MISSING_MAPPING, [{
          field: "messageType",
          message: `Couldn't find any mapping for ${message.messageType}`
        }]));
      }
    });
  }

  let inProgress = false;
  this.digestMessages = (messages) => {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    async function rollback() {
      const cancelBatch = $$.promisify(storageService.cancelBatch);
      try {
        await cancelBatch();
      } catch (e) {
        console.log("Not able to cancel batch", e)
      }
      inProgress = false;

    }

    async function finish() {
      const commitBatch = $$.promisify(storageService.commitBatch);
      try {
        await commitBatch();
      } catch (e) {
        console.log("Not able to commit batch", e)
      }

      inProgress = false;
    }

    return new Promise(async (resolve, reject) => {
        if (inProgress) {
          throw errMap.newCustomError(errMap.errorTypes.DIGESTING_MESSAGES);
        }
        inProgress = true;
        storageService.beginBatch();

        //commitPromisses will contain promises for each of message
        let commitPromisses = [];
        let mappingsInstances = [];
        //we will use this array to keep all the failed mapping instance in order to cancel batch operations on touched DSUs
        let failedMappingInstances = [];

        let failedMessages = [];

        function handleErrorsDuringPromiseResolving(err) {
          reject(err);
        }

        for (let i = 0; i < messages.length; i++) {
          let message = messages[i];
          if (typeof message !== "object") {
            let err = errMap.newCustomError(errMap.errorTypes.MESSAGE_IS_NOT_AN_OBJECT, [{detailsMessage: `Found type: ${typeof message} expected type object`}]);
            failedMessages.push({
              message: message,
              reason: err.message,
              error: err
            });

            //wrong message type... so we log, and then we continue the execution with the rest of the messages
            continue;
          }

          try {
            let mappingInstance = await executeMappingFor(message);
            mappingsInstances.push(mappingInstance);
          } catch (err) {
            //this .mappingInstance prop is artificial injected from the executeMappingFor function in case of an error during mapping execution
            //isn't too nice, but it does the job
            if(err.mappingInstance){
              failedMappingInstances.push(err.mappingInstance);
            }

            errorHandler.reportUserRelevantError("Caught error during message digest", err);
            failedMessages.push({
              message: message,
              reason: err.message,
              error: err
            });
          }
        }

        function digestConfirmation(results) {

          for (let index = 0; index < results.length; index++) {
            let result = results[index];
            switch (result.status) {
              case "fulfilled" :
                if (result.value === false) {
                  // message digest failed
                  failedMessages.push({
                    message: messages[index],
                    reason: `Not able to digest message due to missing suitable mapping`,
                    error: errMap.errorTypes.MISSING_MAPPING
                  });
                }
                break;
              case "rejected" :
                failedMessages.push({
                  message: messages[index],
                  reason: result.reason,
                  error: result.reason
                });
                break;
            }
          }

          finish().then(async () => {
            //in case that we have failed messages we need to reset touched DSUs of that mapping;
            //the reason being that a DSU can be kept in a local cache and later on this fact that the DSU is in a "batch" state creates a strange situation
            for (let j = 0; j < failedMappingInstances.length; j++) {
              let mapInstance = failedMappingInstances[j];
              if (mapInstance.registeredDSUs) {
                for (let i = 0; i < mapInstance.registeredDSUs.length; i++) {
                  let touchedDSU = mapInstance.registeredDSUs[i];
                  try{
                    await $$.promisify(touchedDSU.cancelBatch, touchedDSU)();
                  }catch(err){
                    //we ignore any cancel errors for the moment
                  }
                }
              }
            }

            //not that we finished with the partial rollback we can return the failed messages
            resolve(failedMessages);
          }).catch(async (err) => {
            await rollback();
            reject(err);
          });
        }

        for (let i = 0; i < mappingsInstances.length; i++) {
          commitPromisses.push(commitMapping(mappingsInstances[i]));
        }

        Promise.allSettled(commitPromisses)
          .then(digestConfirmation)
          .catch(handleErrorsDuringPromiseResolving);

      }
    );
  }

  return this;
}

module.exports = {
  getMappingEngine: function (persistenceDSU, options) {
    return new MappingEngine(persistenceDSU, options);
  },
  getMessagesPipe: function () {
    return require("./messagesPipe");
  },
  getErrorsMap: function () {
    return errMap;
  },
  defineMapping: mappingRegistry.defineMapping,
  defineApi: apisRegistry.defineApi
}
