/*
html API space
*/

const getDossierBuilder = () => {
    return new (require("./DossierBuilder"))()
}

module.exports = {
    getDossierBuilder
}
