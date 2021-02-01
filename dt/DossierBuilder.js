const fs = require("fs");
const openDSU = require("opendsu");
const keyssi = openDSU.loadApi("keyssi");
const resolver = openDSU.loadApi("resolver");

const operations = {
    DELETE: "delete",
    ADD_FOLDER: "addfolder",
    ADD_FILE: "addfile",
    MOUNT: "mount"
}

const DossierBuilder = function(){

    let needsUpdating = false;

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
    };

    let del = function (bar, path, options, callback) {
        if (typeof options === 'function'){
            callback = options;
            options = {}
        }
        options = options || {ignoreMounts: false};
        console.log("Deleting " + path);
        needsUpdating = true;
        bar.delete(path, options, callback);
    };

    let addFolder = function (folder_root = "/") {
        return function (bar, arg, options, callback){
            if (typeof options === 'function'){
                callback = options;
                options = {}
            }
            options = options || {batch: false, encrypt: false};
            console.log("Adding Folder " + folder_root + arg)
            needsUpdating = true;
            bar.addFolder(arg, folder_root, options, callback);
        };
    };

    let addFile = function (bar, arg, options, callback) {
        if (typeof options === 'function'){
            callback = options;
            options = {}
        }
        options = options || {encrypt: true, ignoreMounts: false}
        console.log("Copying file " + arg.from + " to " + arg.to)
        needsUpdating = true;
        bar.addFile(arg.from, arg.to, options, callback)
    };

    let mount = function (bar, arg, options, callback) {
        if (typeof options === 'function'){
            callback = options;
            options = undefined
        }

        readFile(arg.seed_path, (err, data) => {
            if (err)
                return callback(err);
            let seed = data.toString();
            console.log("Mounting " + arg.seed_path + " with seed " + seed + " to " + arg.mount_point);
            needsUpdating = false;
            bar.mount(arg.mount_point, seed, callback);
        });
    };

    let mount_folders = function (bar, arg, callback) {
        let base_path = arg.seed_path.split("*");
        let names = fs.readdirSync(base_path[0]);
        let arguments = names.map(n => {
            return {
                "seed_path": arg.seed_path.replace("*", n),
                "mount_point": arg.mount_point.replace("*", n)
            };
        });
        execute(bar, mount, arguments, callback);
    };

    let evaluate_mount = function(bar, cmd, callback){
        if (needsUpdating)
            return refreshDSU(bar, (err, updatedDossier, keySSIstring) => {
                if (err)
                    return callback(err);
                evaluate_mount(updatedDossier, cmd, callback)
            });

        let arguments = {
            "seed_path": cmd[0],
            "mount_point": cmd[1]
        };

        if (!arguments.seed_path.match(/[\\/]\*[\\/]/))
            mount(bar, arguments, callback);             // single mount
        else
            mount_folders(bar, arguments, callback);     // folder mount
    };

    let createDossier = function (conf, commands, callback) {
        console.log("creating a new dossier...")
        resolver.createDSU(keyssi.buildSeedSSI(conf.domain), (err, bar) => {
            if (err)
                return callback(err);
            updateDossier(bar, conf, commands, callback);
        });
    };

    let readFile = function (filePath, callback) {
        fs.readFile(filePath, (err, content) => {
            if (err || content.length === 0)
                return callback(err);

            callback(undefined, content.toString());
        })
    };

    let writeFile = function (filePath, data, callback) {
        fs.writeFile(filePath, data, (err) => {
            if (err)
                return callback(err);
            callback(undefined, data.toString());
        });
    };

    let storeKeySSI = function (seed_path, keySSI, callback) {
        writeFile(seed_path, keySSI, callback);
    };

    let runCommand = function(bar, command, cfg, callback){
        let cmd = command.split(/\s+/);
        switch (cmd.shift().toLowerCase()){
            case operations.DELETE:
                execute(bar, del, cmd, callback);               // allows for multi argument delete
                //del(bar, cmd[0], callback);
                break;
            case operations.ADD_FOLDER:
                execute(bar, addFolder(), cmd, callback);       // allows for multi argument add folder
                //addFolder()(bar, cmd[0], callback);
                break;
            case operations.ADD_FILE:
                let arg = {
                    "from": cmd[0],
                    "to": cmd[1]
                }
                addFile(bar, arg, callback);
                break;
            case operations.MOUNT:
                evaluate_mount(bar, cmd, callback)
                break;
            default:
                return callback(new Error("Invalid operation requested: " + command));
        }
    };

    let refreshDSU = function(bar, callback){
        bar.getKeySSIAsString((err, barKeySSI) => {
            if (err)
                return callback(err);

            resolver.loadDSU(barKeySSI, (err, loadedDossier) => {
                if (err)
                    return callback(err);
                needsUpdating = false;
                callback(undefined, loadedDossier, barKeySSI);
            });
        });
    };

    let saveDSU = function(bar, cfg, callback){
        refreshDSU(bar, (err, loadedDossier, barKeySSI) => {
            if (err)
                return callback(err);
            storeKeySSI(cfg.seed, barKeySSI, callback);
        });
    };

    let updateDossier = function(bar, cfg, commands, callback) {
        if (commands.length === 0)
            return saveDSU(bar, cfg, callback);
        let cmd = commands.shift();
        runCommand(bar, cmd, cfg, (err, result) => {
            if (err)
                return callback(err);
            updateDossier(bar, cfg, commands, callback);
        });
    };

    this.buildDossier = function(cfg, commands, callback){
        if (typeof commands === 'function'){
            callback = commands;
            commands = [];
        }

        readFile(cfg.seed, (err, content) => {
            if (err || content.length === 0)
                return createDossier(cfg, commands, callback);

            let keySSI;
            try {
                keySSI = keyssi.parse(content.toString());
            } catch (err) {
                console.log("Invalid keySSI");
                return createDossier(cfg, commands, callback);
            }

            if (keySSI.getDLDomain() !== cfg.domain) {
                console.log("Domain change detected.");
                return createDossier(cfg, commands, callback);
            }

            console.log("Dossier updating...");
            resolver.loadDSU(content.toString(), (err, bar) => {
                if (err)
                    return callback(err);
                updateDossier(bar, cfg, commands, callback);
            });
        });
    };
};

module.exports = DossierBuilder;
