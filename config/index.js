let indexDbVaultEnabled = false;

function enableIndexDbVault() {
    indexDbVaultEnabled = true;
}

function indexDbVaultIsEnabled() {
    return indexDbVaultEnabled;
}

module.exports = {
    enableIndexDbVault,
    indexDbVaultIsEnabled
}