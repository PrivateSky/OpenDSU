const DEFAULT_DOSSIER_SEED_FILE_PATH = "./seed";
const DEFAULT_CARDINAL_SEED_FILE_PATH = "../cardinal/seed";
const DEFAULT_THEMES_PATH = "../themes";
const DEFAULT_DOMAIN = "default";

const fs = require("fs");
const path = require("path");
const openDSU = require("opendsu");
const keyssi = openDSU.loadApi("keyssi");
const resolver = openDSU.loadApi("resolver");

/**
 * Automates the Dossier Building process
 * Call via
 * <pre>
 *     builder.build(config, callback)
 * </pre>
 * where the config is as follows (for a theme for instance):
 * <pre>
 *     {
 *          "dossier_seed": "./seed",
 *          "domain": "default",
 *          "bundles_path": "../../privatesky/psknode/bundles",
 *          "delete": ["/"],
 *          "folders": ["src"],
 *          "copy": [],
 *          "mounts": []
 *     }
 * </pre>
 * For a Simple SSApp (with only mounting of cardinal/themes and creation of code folder):
 * <pre>
 *      {
 *          "dossier_seed": "./seed",
 *          "domain": "default",
 *          "bundles_path": "../privatesky/psknode/bundles",
 *          "delete": [
 *              "/"
 *          ],
 *          "folders": [
 *              "code"
 *          ],
 *          "copy": [],
 *          "mounts": [
 *              {
 *                  "mount_point": "/cardinal",
 *                  "type": "seed",
 *                  "arguments": {
 *                      "path": "../cardinal/seed"
 *                  }
 *               },
 *               {
 *                  "mount_point": "/themes",
 *                  "type": "folder",
 *                  "arguments": {
 *                      "path": "../themes",
 *                      "seed": "seed",
 *                      "name": "$folder"
 *                  }
 *                }
 *          ]
 *     }
 * </pre>
 *
 * each entry in the copy list should be:
 * <pre>
 *     {
 *         "from": "...",
 *         "to": "..."
 *     }
 * </pre>
 */
const DossierBuilder = function() {
    /**
     * Builds the config object from a file path if necessary
     * @param {string|object} pathOrObject: the path to the config json file or the config object
     * @param {function} callback:
     */
    let load_config = function (pathOrObject, callback) {
        if (typeof pathOrObject === 'string') {
            fs.readFile(pathOrObject, (err, data) => {
                if (err)
                    return callback(err);
                let cfg;

                try {
                    cfg = handle_defaults(JSON.parse(data.toString()));
                } catch (e) {
                    return callback(e);
                }

                callback(undefined, cfg);
            });
        } else
            callback(undefined, handle_defaults(pathOrObject));
    }
    /**
     * Fills any missing required configuration data with the defaults values
     * @param {object} c: the provided config
     */
    let handle_defaults = function (c) {
        c.dossier_seed = c.dossier_seed || DEFAULT_DOSSIER_SEED_FILE_PATH;
        c.cardinal_seed = c.cardinal_seed || DEFAULT_CARDINAL_SEED_FILE_PATH;
        c.themes_folder = c.themes_folder || DEFAULT_THEMES_PATH;
        c.domain = c.domain || DEFAULT_DOMAIN;
        return c;
    }


    /**
     * recursively executes the provided func with the dossier and each of the provided arguments
     * @param {DSU Archive} dossier: The DSU instance
     * @param {function} func: function that accepts the dossier and one param as arguments
     * @param {any} arguments: a list of arguments to be consumed by the func param
     * @param {function} callback: callback function. The first argument must be err
     */
    let execute = function (dossier, func, arguments, callback) {
        let arg = arguments.pop();
        if (! arg)
            return callback();
        let options = typeof arg === 'object' && arg.options ? arg.options : undefined;
        func(dossier, arg, options, (err, result) => {
            if (err)
                return callback(err);

            if (arguments.length !== 0) {
                execute(dossier, func, arguments, callback);
            } else {
                callback(undefined, result);
            }
        });
    }

    let del = function (bar, path, options, callback) {
        if (typeof options === 'function'){
            callback = options;
            options = {}
        }
        options = options || {ignoreMounts: false};
        console.log("Deleting " + path);
        bar.delete(path, options, callback);
    }

    let addFolder = function (folder_root = "/") {
        return function (bar, arg, options, callback){
            if (typeof options === 'function'){
                callback = options;
                options = {}
            }
            options = options || {batch: false, encrypt: false};
            console.log("Adding Folder " + folder_root + arg)
            bar.addFolder(arg, folder_root, options, callback);
        };
    }

    let addFile = function (bar, arg, options, callback) {
        if (typeof options === 'function'){
            callback = options;
            options = {}
        }
        options = options || {encrypt: true, ignoreMounts: false}
        console.log("Copying file " + arg.from + " to " + arg.to)
        bar.addFile(arg.from, arg.to, options, callback)
    }

    /**
     * mounts in the provided bar according to the mount_obj
     * @param bar
     * @param {object} mount_obj
     * @param {object} options
     * @param {function} callback
     */
    let mount = function (bar, mount_obj, options, callback) {
        if (typeof options === 'function'){
            callback = options;
            options = undefined
        }

        if (mount_obj.type === 'folder')
            return mount_folders(bar, mount_obj, options, callback);

        readFile(mount_obj.arguments.path, (err, data) => {
            if (err)
                return callback(err);
            let seed = data.toString();
            console.log("Mounting " + mount_obj.arguments.path + " with seed " + seed + " to " + mount_obj.mount_point);
            bar.mount(mount_obj.mount_point, seed, callback);
        });

    }

    let mount_folders = function (bar, mount_obj, options, callback) {
        let names = fs.readdirSync(mount_obj.arguments.path);
        let arguments = names.map(n => {
            return {
                mount_point: path.join(mount_obj.mount_point, mount_obj.arguments.name.replace('$folder', n)),
                type: "seed",
                arguments: {
                    path: path.join(mount_obj.arguments.path, n, "seed")
                },
                options: options
            };
        });
        execute(bar, mount, arguments, callback);
    }

    let createDossier = function (conf, callback) {
        resolver.createDSU(keyssi.buildSeedSSI(conf.domain), (err, bar) => {
            if (err)
                return callback(err);
            updateDossier(bar, conf, callback);
        })
    }

    let updateDossier = function (bar, conf, callback) {
        execute(bar, del, conf.delete, (err, result) => {
            if (err)
                return callback(err);

            execute(bar, addFolder('/'), conf.folders, (err, result) => {
                if (err)
                    return callback(err);

                execute(bar, addFile, conf.copy, (err, result) => {
                    if (err)
                        return callback(err);

                    bar.getKeySSIAsString((err, barKeySSI) => {
                        if (err)
                            return callback(err);

                        resolver.loadDSU(barKeySSI, (err, loadedDossier) => {
                            if (err)
                                return callback(err);

                            execute(loadedDossier, mount, conf.mounts, (err, result) => {
                                if (err)
                                    return callback(err);
                                storeKeySSI(conf.dossier_seed, barKeySSI, callback);
                            });
                        });
                    });
                });
            });
        });
    }

    let readFile = function (filePath, callback) {
        fs.readFile(filePath, (err, content) => {
            if (err || content.length === 0)
                return callback(err);

            callback(undefined, content.toString());
        })
    }

    let writeFile = function (filePath, data, callback) {
        fs.writeFile(filePath, data, (err) => {
            if (err)
                return callback(err);
            callback(undefined, data.toString());
        });
    }

    let storeKeySSI = function (seed_path, keySSI, callback) {
        writeFile(seed_path, keySSI, callback);
    }

    this.build = function (config, callback) {
        load_config(config, (err, conf) => {
            if (err)
                return callback(err);

            readFile(conf.dossier_seed, (err, content) => {
                if (err || content.length === 0) {
                    console.log(`Creating a new Dossier...`);
                    return createDossier(conf, callback);
                }

                let keySSI;
                try {
                    keySSI = keyssi.parse(content.toString());
                } catch (err) {
                    console.log("Invalid keySSI. Creating a new Dossier...");
                    return createDossier(conf, callback);
                }

                if (keySSI.getDLDomain() !== conf.domain) {
                    console.log("Domain change detected. Creating a new Dossier...");
                    return createDossier(conf, callback);
                }

                console.log("Dossier updating...");
                resolver.loadDSU(content.toString(), (err, bar) => {
                    if (err)
                        return callback(err);

                    updateDossier(bar, conf, callback);
                });
            });
        });
    }
}

module.exports = DossierBuilder;
