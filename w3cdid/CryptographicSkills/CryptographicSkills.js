const cryptoSkillsRegistry = {};
const methodsNames = require("../didMethodsNames");
const KeyDID_CryptographicSkills = require("./KeyDID_CryptographicSkills");
const NameDID_CryptographicSkills = require("./NameDID_CryptographicSkills");
const GroupDID_CryptographicSkills = require("./GroupDID_CryptographicSkills");
const SReadDID_CryptographicSkills = require("./SReadDID_CryptographicSkills");
const SSI_KeyDID_CryptographicSkills = require("./SSI_KeyDID_CryptographicSkills");

const registerSkills = (didMethod, skills) => {
    cryptoSkillsRegistry[didMethod] = skills;
}

const applySkill = (didMethod, skillName, ...args) => {
    return cryptoSkillsRegistry[didMethod][skillName](...args);
}

registerSkills(methodsNames.NAME_SUBTYPE, new NameDID_CryptographicSkills());
registerSkills(methodsNames.GROUP_METHOD_NAME, new GroupDID_CryptographicSkills());
registerSkills(methodsNames.S_READ_SUBTYPE, new SReadDID_CryptographicSkills());
registerSkills(methodsNames.SSI_KEY_SUBTYPE, new SSI_KeyDID_CryptographicSkills());
registerSkills(methodsNames.KEY_SUBTYPE, new KeyDID_CryptographicSkills());

module.exports = {
    registerSkills,
    applySkill,
    NAMES: require("./cryptographicSkillsNames"),
    CryptographicSkillsMixin: require("./CryptographicSkillsMixin")
};