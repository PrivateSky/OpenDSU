// const NewState1 = {
//   'mergedState': {
//     './file1': {
//       mostUpToDateUserDSU: 'keySSIUser1',
//       versions: ['uidA3', 'uidA2', ...]
//     },
//     './file2': {
//       mostUpToDateUserDSU: 'keySSIUser1',
//       versions: ['uidB3', 'uidB2', ...]
//     }
//   },
//   'usersState': {
//     'User1KeySSI': {
//       './file1': '1id1',
//       './file2': 't9fq3j924rrf'
//
//     },
//     'User2KeySSI': {
//       './file1': '1id1',
//       './file2': '2id1', // incoming -> 'afsdf03d4y06' from '2id1' -> yields a conflict
//     }
//   },
//   changesMap: {
//     't9fq3j924rrf': 'UserKeySSI1',
//     'j9irg93daag4': 'UserKeySSI3',
//     'afsdf03d4y06': 'UserKeySSI1',
//     ...
//   },
// }


function BigFileStorageStrategy(loadFunction, storeFunction, afterInitialisation){
  let volatileMemory = {
    mergedStack: [],
    userDSUs: {},
    recordsMap: {}
  }

  let self = this

  if (loadFunction) {
    loadFunction( (err, data) => {
      if(err){
        console.log(err.message);
      } else {
        volatileMemory = JSON.parse(data);
        console.log("BigFileStorageStrategy loading state:",volatileMemory);
      }
      if(afterInitialisation) afterInitialisation();
    });
  } else {
    if(afterInitialisation) afterInitialisation();
  }

  function autoStore(){
    if(storeFunction){
      let storedState = JSON.stringify(volatileMemory);
      storeFunction(storedState, function(err, res){
        if(err){
          reportUserRelevantError(createOpenDSUErrorWrapper("Failed to autostore db file", err));
        }
        console.log("BigFileStorageStrategy storing state:");
        console.dir(volatileMemory, {depth: null})
      });
    }
  }

  function getCollection(collectionName){
    let collection = volatileMemory[collectionName];
    if(!collection){
      collection = volatileMemory[collectionName] = {};
    }
    return collection;
  }

  /*
     Get the whole content of the collection and asynchronously returns an array with all the  records satisfying the condition tested by the filterFunction
  */
  this.filterCollection = function(collectionName, filterFunction, callback){
    let tbl = getCollection(collectionName);
    let result = [];
    for(let n in tbl){
      let item = tbl[n];
      if(filterFunction(item)){
        item.__key = n;
        result.push(item);
      }
    }
    callback(undefined,result);
  };

  this.merge = (record, changeBaseRecord) => {
    if (changeBaseRecord && changeBaseRecord.__id === this.getLatestCommonRecord()) {
      return !!volatileMemory.mergedStack.unshift(record)

    }

    return false
  }

  /*
    Insert a record, return error if already exists
  */
  this.insertRecord = function(collectionName, key, record, changeBaseRecord, callback, reInsert = false){
    let currentParent = getCollection(collectionName)

    function _insertRecord(currentParent, currentKey) {
      volatileMemory.recordsMap[record.__id] = record;
      currentParent[currentKey].unshift = record.__id;
      if (this.merge(record, changeBaseRecord)) {
        setTimeout(() => autoStore(), 0)
      }
      else {
        this.triggerUserMergeNotification()
      }

      callback(undefined, record);
    }

    if (typeof key === 'string') {
      _insertRecord(currentParent, key)
    }
    else {
      let currentKey = key[0];
      for (let i = 1; i <= key.length; i++) {
        if (currentParent[currentKey] == undefined){
          currentParent[currentKey] = i === key.length ? undefined : []
        }

        if (i === key.length) {
          break
        }
        else {
          currentParent = currentParent[currentKey]
          currentKey = key[i];
        }
      }

      _insertRecord(currentParent, currentKey)
    }
  };

  /*
      Update a record, return error if does not exists
   */
  this.updateRecord = function(collectionName, key, record, changeBaseRecord, callback){
      self.insertRecord(collectionName, key, record, changeBaseRecord, callback, true);
  };

  this.getLatestCommonRecord = () => {
    return volatileMemory.mergedStack[0]
  }

  this.triggerUserMergeNotification = () => {
    console.log('notify user')
  }

  /*
      Get a single row from a collection
   */
  this.getRecord = function(collectionName, key, callback){
    let tbl = getCollection(collectionName);
    let record;
    if (typeof key === 'string') {
      record = tbl[key];
      if( record == undefined){
        return callback(new Error("Can't retrieve a record for key " + key))
      }
      callback(undefined, record);
    }
    else {
      record = tbl[key[0]]
      for (let i = 1; i <= key.length; i++) {
        if (record == undefined){
          return callback(new Error("Can't retrieve a record for key " + key.concat(".")))
        }

        if (i === key.length) {
          break
        }
        else {
          record = record[key[i]];
        }
      }

      callback(undefined, record);
    }
  };
}
module.exports = BigFileStorageStrategy;
