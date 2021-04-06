const envVariables = {};
function getEnvironmentVariable(name){
    if (typeof envVariables[name] !== "undefined") {
        return envVariables[name];
    }
    return process.env[name];
}
function setEnvironmentVariable(name, value){
    envVariables[name] = value;
}

function getFS(){
    const fsName = "fs";
    return require(fsName);
}

function getPath(){
    const pathName = "path";
    return require(pathName);
}

module.exports = {
    getEnvironmentVariable,
    setEnvironmentVariable,
    getFS,
    getPath
}