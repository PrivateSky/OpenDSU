let stores = {};
const config = require("opendsu").loadApi("config");
const CacheMixin = require("../utils/PendingCallMixin");
const constants = require("../moduleConstants");

function FSCache(folderName) {
    const self = this;
    CacheMixin(self);
    const fsName = "fs"; //do not tempt browserify
    const fs = require(fsName);
    let baseFolder = config.get(constants.CACHE.BASE_FOLDER_CONFIG_PROPERTY);
    if (typeof baseFolder === "undefined") {
        baseFolder = process.cwd();
    }
    const path = require("swarmutils").path;
    const folderPath = path.join(baseFolder, folderName);
    let storageFolderIsCreated = false;
    fs.mkdir(folderPath, {recursive: true}, (err) => {
        if (err) {
            throw err;
        }

        storageFolderIsCreated = true;
    });

    self.get = function (key, callback) {
        if (!storageFolderIsCreated) {
            self.addPendingCall(() => {
                self.get(key, callback);
            })
        } else {
            const filePath =path.join(folderPath, key)
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read file <${filePath}>`, err));
                }

                let content = data;
                try {
                    if(content != undefined && content != "undefined"){
                        content = JSON.parse(content.toString())
                    } else {
                        callback(undefined, undefined);
                    }
                } catch (e) {
                    console.log(e, content);
                    if(callback){
                        return callback(e);
                    }
                    return undefined;
                }
                callback(undefined, content);
            });
        }
    };

    self.put = function (key, value, callback) {
        if (Array.isArray(value)) {
            value = JSON.stringify(value);
        }
        if (!storageFolderIsCreated) {
            self.addPendingCall(() => {
                self.put(key, value, callback);
            });
        } else {
            if (!callback) {
                callback = () => {
                };
            }
            fs.writeFile(path.join(folderPath, key), value, callback);
        }
    }

    self.set = self.put;
}



module.exports.FSCache = FSCache;