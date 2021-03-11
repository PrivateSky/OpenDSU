const ObservableMixin = require("../../utils/ObservableMixin");
const {uid} = require("../utils")

function Record(uid) {
  const versionHistory = [{
    uid,
    timestamp: Date.now()
  }];

  this.addVersion = (versionId) => {
    versionHistory.unshift({
      uid: versionId,
      timestamp: Date.now()
    })
  }

  this.getVersions = () => {
    return versionHistory;
  }

  this.getLatestVersion = () => {
    return versionHistory[0];
  }

  this.getJson = () => {
    return versionHistory
  }
}

function BasicSharedDB(readFunction, writeFunction, onInitialisationDone) {
  ObservableMixin(this);
  let localMemory = {
    usersState: {},
    versionsMap: {}
  }
  const {usersState, versionsMap} = localMemory

  if (readFunction) {
    readFunction((err, data) => {
      if(err){
        console.log(err.message);
      } else {
        localMemory = JSON.parse(data);
        console.log("BigFileStorageStrategy loading state:", volatileMemory);
      }
      if (onInitialisationDone) onInitialisationDone();
    });
  } else {
    if (onInitialisationDone) onInitialisationDone();
  }

  function autoStore(userSReadSSI){
    if(writeFunction){
      let storedState = JSON.stringify(usersState[userSReadSSI]);
      writeFunction(storedState, userSReadSSI, function(err, res){
        if(err){
          reportUserRelevantError(createOpenDSUErrorWrapper("Failed to autostore db file", err));
        }
        console.log("localMemory:");
        console.dir(localMemory, {depth: null})
      });
    }
  }

  this.insertRecord = (recordPath, userKeySSI, callback) => {
    if (usersState[userKeySSI][recordPath]) {
      return callback(new Error(`Record under ${recordPath} already exists.`))
    }
    const versionUid = uid()
    const newRecord = new Record(userKeySSI, versionUid)

    usersState[userKeySSI][recordPath] = newRecord
    versionsMap[versionUid] = userKeySSI
    setTimeout(() => autoStore(userKeySSI), 0)
    return callback ? callback(null, versionUid) : versionUid;
  };

  this.updateRecord = (recordPath, userKeySSI, baseVersion, callback) => {
    const versionUid = uid()
    usersState[userKeySSI][recordPath] = newRecord
    versionsMap[versionUid] = userKeySSI
    setTimeout(() => autoStore(userKeySSI), 0)
    return callback ? callback(null, versionUid) : versionUid;
  }

  this.getRecord = (recordPath, userKeySSI, callback) => {
    return usersState[userKeySSI][recordPath]
  }
}

module.exports = BasicSharedDB;
