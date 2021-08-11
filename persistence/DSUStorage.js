const { fetch } = require("./utils");

// helpers

function doDownload(url, expectedResultType, callback) {
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      response[expectedResultType]()
        .then((data) => {
          return callback(undefined, data);
        })
        .catch((err) => {
          throw err;
        });
    })
    .catch((err) => {
      return callback(err);
    });
}

function doUpload(url, data, callback) {
  fetch(url, {
    method: "POST",
    body: data,
  })
    .then((response) => {
      return response.json().then((data) => {
        if (!response.ok || response.status != 201) {
          let errorMessage = "";
          if (Array.isArray(data) && data.length) {
            errorMessage = `${data[0].error.message}. Code: ${data[0].error.code}`;
          } else if (typeof data === "object") {
            errorMessage = data.message ? data.message : JSON.stringify(data);
          }

          let error = new Error(errorMessage);
          error.data = data;
          throw error;
        }

        if (Array.isArray(data)) {
          let responses = [];
          for (const item of data) {
            console.log(`Uploaded ${item.file.name} to ${item.result.path}`);
            responses.push(item.result.path);
          }
          callback(undefined, responses.length > 1 ? responses : responses[0]);
        }
      });
    })
    .catch((err) => {
      return callback(err);
    });
}

function doFileUpload(path, files, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }

  const formData = new FormData();
  let inputType = "file";

  if (Array.isArray(files)) {
    for (const attachment of files) {
      inputType = "files[]";
      formData.append(inputType, attachment);
    }
  } else {
    formData.append(inputType, files);
  }

  let url = `/upload?path=${path}&input=${inputType}`;
  if (typeof options !== "undefined" && options.preventOverwrite) {
    url += "&preventOverwrite=true";
  }
  doUpload(url, formData, callback);
}

function doRemoveFile(url, callback) {
  fetch(url, { method: "DELETE" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      callback();
    })
    .catch((err) => {
      return callback(err);
    });
}

function performRemoval(filePathList, callback) {
  if (!Array.isArray(filePathList)) {
    filePathList = [filePathList];
  }

  let errors = [];
  let deletedFiles = [];

  let deleteFile = (path) => {
    let filename = path;
    if (path[0] !== "/") {
      path = "/" + path;
    }
    let url = "/delete" + path;
    doRemoveFile(url, (err) => {
      if (err) {
        //console.log(err);
        errors.push({
          filename: filename,
          message: err.message,
        });
      } else {
        deletedFiles.push(filename);
      }

      if (filePathList.length > 0) {
        return deleteFile(filePathList.shift());
      }
      callback(errors.length ? errors : undefined, deletedFiles);
    });
  };

  deleteFile(filePathList.shift());
}

// service

class DSUStorage {
  constructor() {
    this.directAccessEnabled = false;
  }

  enableDirectAccess(callback) {
    let self = this;

    function addFunctionsFromMainDSU() {
      if (!self.directAccessEnabled) {
        let sc = require("opendsu").loadAPI("sc");
        let availableFunctions = [
          "addFile",
          "addFiles",
          "addFolder",
          "appendToFile",
          "createFolder",
          "delete",
          "extractFile",
          "extractFolder",
          "getArchiveForPath",
          "getCreationSSI",
          "getKeySSI",
          "listFiles",
          "listFolders",
          "mount",
          "readDir",
          "readFile",
          "rename",
          "unmount",
          "writeFile",
          "listMountedDSUs",
          "beginBatch",
          "commitBatch",
          "cancelBatch",
        ];

        sc.getMainDSU((err, mainDSU) => {
          for (let f of availableFunctions) {
            self[f] = mainDSU[f];
          }
          self.directAccessEnabled = true;
          callback(undefined, true);
        });
      } else {
        callback(undefined, true);
      }
    }

    addFunctionsFromMainDSU();
  }

  call(name, ...args) {
    if (args.length === 0) {
      throw Error(
        "Missing arguments. Usage: call(functionName, arg1, arg2 ... callback)"
      );
    }

    const callback = args.pop();
    const url =
      "/api?" +
      new URLSearchParams({ name: name, arguments: JSON.stringify(args) });
    fetch(url, { method: "GET" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json();
      })
      .then((result) => {
        callback(...result);
      })
      .catch((err) => {
        return callback(err);
      });
  }

  setObject(path, data, callback) {
    try {
      let dataSerialized = JSON.stringify(data);
      this.setItem(path, dataSerialized, callback);
    } catch (e) {
      callback(createOpenDSUErrorWrapper("setObject failed", e));
    }
  }

  getObject(path, callback) {
    this.getItem(path, "json", function (err, res) {
      if (err || !res) {
        return callback(undefined, undefined);
      }
      callback(undefined, res);
    });
  }

  setItem(path, data, callback) {
    if (!this.directAccessEnabled) {
      let segments = path.split("/");
      let fileName = segments.splice(segments.length - 1, 1)[0];
      path = segments.join("/");
      if (!path) {
        path = "/";
      }
      let url = `/upload?path=${path}&filename=${fileName}`;
      doUpload(url, data, callback);
    } else {
      this.writeFile(path, data, callback);
    }
  }

  getItem(path, expectedResultType, callback) {
    if (typeof expectedResultType === "function") {
      callback = expectedResultType;
      expectedResultType = "arrayBuffer";
    }

    if (!this.directAccessEnabled) {
      if (path[0] !== "/") {
        path = "/" + path;
      }

      path = "/download" + path;
      doDownload(path, expectedResultType, callback);
    } else {
      this.readFile(path, function (err, res) {
        if (err) {
          return callback(err);
        }
        try {
          if (expectedResultType == "json") {
            res = JSON.parse(res.toString());
          }
        } catch (err) {
          return callback(err);
        }
        callback(undefined, res);
      });
    }
  }

  uploadFile(path, file, options, callback) {
    doFileUpload(...arguments);
  }

  uploadMultipleFiles(path, files, options, callback) {
    doFileUpload(...arguments);
  }

  deleteObjects(objects, callback) {
    performRemoval(objects, callback);
  }

  removeFile(filePath, callback) {
    console.log("[Warning] - obsolete. Use DSU.deleteObjects");
    performRemoval([filePath], callback);
  }

  removeFiles(filePathList, callback) {
    console.log("[Warning] - obsolete. Use DSU.deleteObjects");
    performRemoval(filePathList, callback);
  }
}

let dsuStorageInstance;

function getDSUStorage() {
  if (typeof dsuStorageInstance === "undefined") {
    dsuStorageInstance = new DSUStorage();
  }

  return dsuStorageInstance;
}

module.exports = getDSUStorage;
