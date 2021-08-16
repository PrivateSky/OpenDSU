const getDSUStorage = require("./DSUStorage");
const { promisify } = require("./utils");

const SC_PATH = "/security-context";
const DB_PATH = "/databases/config";
const DB_DEFAULT = "mainDB";

// helpers

async function createSSI(domainName) {
  return new Promise((resolve, reject) => {
    const keySSISpace = require("opendsu").loadAPI("keyssi");

    keySSISpace.createSeedSSI(domainName, (err, keySSI) => {
      if (err) {
        return reject(err);
      }
      return resolve(keySSI.getIdentifier());
    });
  });
}

async function loadSecurityContext(dsuStorage, domainName) {
  const getKeySSIForSecurityContext = async () => {
    return new Promise((resolve, reject) => {
      dsuStorage.getObject(SC_PATH, (err, keySSI) => {
        if (err || !keySSI) {
          return reject();
        }

        return resolve(keySSI.identifier);
      });
    });
  };
  const setKeySSIForSecurityContext = async (scKeySSI) => {
    return new Promise((resolve, reject) => {
      dsuStorage.setObject(SC_PATH, { identifier: scKeySSI }, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  };

  let scKeySSI;

  try {
    scKeySSI = await getKeySSIForSecurityContext();
  } catch (err) {
    scKeySSI = await createSSI(domainName);
    await setKeySSIForSecurityContext(scKeySSI);
  }

  if (!scKeySSI) {
    throw Error(`Failed to load security context`);
  }

  const openDSU = require("opendsu");
  const sc = openDSU.loadAPI("sc");
  const keySSI = openDSU.loadAPI("keyssi");

  sc.getSecurityContext(keySSI.parse(scKeySSI));
}

async function loadWalletDatabase(dsuStorage, domainName, databaseName) {
  try {
    await loadSecurityContext(dsuStorage, domainName);
  } catch (err) {
    console.log(err);
  }

  const dbPath = `${DB_PATH}/${domainName}`;
  let dbConfig = await dsuStorage.getObjectAsync(dbPath);

  if (!dbConfig) {
    dbConfig = {};
  }

  if (!dbConfig[databaseName]) {
    dbConfig[databaseName] = await createSSI(domainName);
    await dsuStorage.setObjectAsync(dbPath, dbConfig);
  }

  const openDSU = require("opendsu");
  const dbAPI = openDSU.loadAPI("db");
  const keySSISpace = openDSU.loadAPI("keyssi");
  const dbKeySSI = dbConfig[databaseName];

  return dbAPI.getWalletDB(keySSISpace.parse(dbKeySSI), databaseName);
}

function promisifyDSUStorage(dsuStorage) {
  for (const f of ["setObject", "getObject"]) {
    dsuStorage[`${f}Async`] = promisify(dsuStorage[f]);
  }
  return dsuStorage;
}

function promisifyWalletStorage(walletStorage) {
  for (const f of [
    "filter",
    "getRecord",
    "insertRecord",
    "updateRecord",
    "commitBatch",
    "cancelBatch",
    "setObject",
    "getObject",
    "deleteObjects",
    "setItem",
    "getItem",
    "uploadFile",
    "uploadMultipleFiles",
  ]) {
    walletStorage[`${f}Async`] = promisify(walletStorage[f]);
  }
  return walletStorage;
}

// service

class WalletStorage {
  /**
   * @param {string} [domainName=${vaultDomain form sc}]
   * @param {string} [databaseName=mainDB]
   * @param {object} [config]
   * @param {boolean} [config.useDirectAccess=false]
   */
  constructor(domainName, databaseName, config) {
    if (!databaseName) {
      databaseName = DB_DEFAULT;
    }

    if (!config) {
      config = {};
    }

    if (typeof config.useDirectAccess !== "boolean") {
      config.useDirectAccess = true;
    }

    this.isDirectAccessEnabled = false;

    let db;
    const dsuStorage = promisifyDSUStorage(getDSUStorage());

    const initializeDatabase = async () => {
      db = "initialising";

      try {
        db = await loadWalletDatabase(
            dsuStorage,
            this.domainName,
            databaseName
        );
        this.databaseName = databaseName;
        this.isDirectAccessEnabled = dsuStorage.directAccessEnabled;
      } catch (err) {
        console.log(err);
      }
    };

    const loadDatabase = () => {
      if (config.useDirectAccess) {
        dsuStorage.enableDirectAccess(initializeDatabase);
      } else {
        setTimeout(initializeDatabase);
      }
    }

    const waitForDatabase = (fun, args) => {
      let func = fun.bind(this);
      setTimeout(function () {
        func(...args);
      }, 10);
    };

    const isDatabaseReady = () => {
      return db !== undefined && db !== "initialising";
    };

    if (!domainName) {
      const sc = require("opendsu").loadAPI("sc");
      sc.getVaultDomain((err, vaultDomain) => {
        if (err) {
          console.log(err);
          return;
        }

        this.domainName = vaultDomain;
        loadDatabase();
      });
    } else {
      this.domainName = domainName;
      loadDatabase();
    }

    /**
     * @param {'db'|'dsuStorage'} nameSpace
     * @param {string} functionName
     * @param {*} args
     */
    this.call = (nameSpace, functionName, ...args) => {
      if (nameSpace === "db") {
        if (isDatabaseReady()) {
          db[functionName](...args);
        } else {
          waitForDatabase(this[functionName], args);
        }
      } else if (nameSpace === "dsuStorage") {
        dsuStorage[functionName](...args);
      } else {
        console.log(
          `Unknown namespace: '${nameSpace}' (values: 'db', 'dsuStorage')`
        );
      }
    };
  }

  // Database specific functions (Storage Service)

  filter(tableName, query, sort, limit, callback) {
    this.call("db", "filter", tableName, query, sort, limit, callback);
  }

  getRecord(tableName, key, callback) {
    this.call("db", "getRecord", tableName, key, callback);
  }

  insertRecord(tableName, key, record, callback) {
    this.call("db", "insertRecord", tableName, key, record, callback);
  }

  updateRecord(tableName, key, record, callback) {
    this.call("db", "updateRecord", tableName, key, record, callback);
  }

  beginBatch() {
    this.call("db", "beginBatch");
  }

  cancelBatch(callback) {
    this.call("db", "cancelBatch", callback);
  }

  commitBatch(callback) {
    this.call("db", "commitBatch", callback);
  }

  // DSU specific functions (DSUStorage)

  setObject(path, data, callback) {
    this.call("dsuStorage", "setObject", path, data, callback);
  }

  getObject(path, callback) {
    this.call("dsuStorage", "getObject", path, callback);
  }

  deleteObjects(objects, callback) {
    this.call("dsuStorage", "deleteObjects", objects, callback);
  }

  setItem(path, data, callback) {
    this.call("dsuStorage", "setItem", path, data, callback);
  }

  getItem(path, expectedResultType, callback) {
    this.call("dsuStorage", "getItem", path, expectedResultType, callback);
  }

  uploadFile(path, file, options, callback) {
    this.call("dsuStorage", "uploadFile", path, file, options, callback);
  }

  uploadMultipleFiles(path, files, options, callback) {
    this.call(
      "dsuStorage",
      "uploadMultipleFiles",
      path,
      files,
      options,
      callback
    );
  }
}

let walletStorageInstance;

function getWalletStorage(domainName, databaseName, config) {
  if (
    typeof walletStorageInstance === "undefined" ||
    walletStorageInstance.domainName !== domainName ||
    walletStorageInstance.databaseName !== databaseName
  ) {
    walletStorageInstance = promisifyWalletStorage(
      new WalletStorage(domainName, databaseName, config)
    );
  }

  return walletStorageInstance;
}

module.exports = getWalletStorage;
