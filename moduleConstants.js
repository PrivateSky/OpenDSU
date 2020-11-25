const ENVIRONMENT_TYPES = require("../overwrite-require/moduleConstants");
module.exports = {
	ENVIRONMENT_TYPES,
	CODE_FOLDER: "/code",
	CONSTITUTION_FOLDER: '/code/constitution',
	BLOCKCHAIN_FOLDER: '/blockchain',
	APP_FOLDER: '/app',
	DOMAIN_IDENTITY_FILE: '/domain_identity',
	ASSETS_FOLDER: "/assets",
	TRANSACTIONS_FOLDER: "/transactions",
	APPS_FOLDER: "/apps",
	DATA_FOLDER: "/data",
	MANIFEST_FILE: "/manifest",
	BDNS_ROOT_HOSTS: "BDNS_ROOT_HOSTS",
	CACHE: {
		FS: "fs",
		INDEXED_DB: "indexedDB",
		VAULT_TYPE: "vaultType",
		BASE_FOLDER: "internal-volume/cache",
		BASE_FOLDER_CONFIG_PROPERTY: "fsCache.baseFolder",
		ENCRYPTED_BRICKS_CACHE: "encrypted-bricks-cache",
		ANCHORING_CACHE: "anchoring-cache",
		NO_CACHE: "no-cache"
	},
	DOMAINS: {
		VAULT: "vault"
	},
	VAULT:{
		BRICKS_STORE: "bricks",
		ANCHORS_STORE: "anchors"
	}
}