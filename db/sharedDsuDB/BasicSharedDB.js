const ObservableMixin = require("../../utils/ObservableMixin");
const {uid} = require("../utils")

function Record(initKeySSI, uid) {
  const versionHistory = [uid];
  let lastUpdated = Date.now();
  let mostUpToDateDsuKeySSI = initKeySSI

  this.addVersion = (userKeySSI, versionId) => {
    lastUpdated = Date.now();
    mostUpToDateDsuKeySSI = userKeySSI
    versionHistory.unshift(versionId)
  }

  this.getMostUpToDateDsuKeySSI = () => {
    return mostUpToDateDsuKeySSI;
  }

  this.getVersions = () => {
    return versionHistory;
  }

  this.getLatestVersion = () => {
    return versionHistory[0];
  }

}

function BasicSharedDB() {
  let self = this;
  ObservableMixin(this);
  let localMemory = {
    mergedState: {},
    usersState: {},
    versionsMap: {}
  }
  const {mergedState, usersState, versionsMap} = localMemory


  this.insertNewRecord = function (recordPath, userKeySSI, callback) {

    if (mergedState[recordPath]) {
      return callback(new Error(`Record under ${recordPath} already exists.`))
    }
    const versionUid = uid()
    const newRecord = new Record(userKeySSI, versionUid)

    mergedState[recordPath] = newRecord
    usersState[userKeySSI][recordPath] = versionUid
    versionsMap[versionUid] = userKeySSI

    return callback(null, versionUid);
  };



  this.updateRecord = function(recordPath, userKeySSI, baseVersion, callback) {
    if (mergedState[recordPath].getLatestVersion() !== baseVersion) {
      return callback(new Error(`Conflict: you are trying to change an outdated record ${recordPath}`))
    }
    const versionUid = uid()
    mergedState[recordPath].addVersion(userKeySSI, versionUid)
    usersState[userKeySSI][recordPath] = versionUid
    versionsMap[versionUid] = userKeySSI

    return callback(null, versionUid);
  }

  this.createNewUserState = function(userKeySSI, callback) {
    if (usersState[userKeySSI]) {
      return callback(new Error(`User ${userKeySSI} already exists`))
    }


    usersState[userKeySSI] = {}

    for (let key in mergedState) {
      usersState[userKeySSI][key] = mergedState[key].getLatestVersion()
    }

    return callback(null, usersState[userKeySSI]);
  };

  this.getVersionsMap = () => {
    return versionsMap
  }
}

module.exports = BasicSharedDB;
