const ENVIRONMENT_TYPES = require("../overwrite-require/moduleConstants");

let cachedKeySSIResolver = undefined;


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
		MEMORY: "memory",
		INDEXED_DB: "cache.indexedDB",
		VAULT_TYPE: "cache.vaultType",
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
	},
	BRICKS_DOMAIN_KEY: "bricksDomain",
	LOADER_ENVIRONMENT_JSON:{
		AGENT: "agent",
		SERVER: "server",
		VAULT: "vault",
		MOBILE: "mobile",
	},
    BOOT_CONFIG_FILE: 'boot-cfg.json',
	 get KEY_SSIS(){
		if(cachedKeySSIResolver === undefined){
			cachedKeySSIResolver = require("key-ssi-resolver");
		}
		 return cachedKeySSIResolver.SSITypes;
	 },
	get CRYPTO_FUNCTION_TYPES(){
		if(cachedKeySSIResolver === undefined){
			cachedKeySSIResolver = require("key-ssi-resolver");
		}
		return cachedKeySSIResolver.CryptoFunctionTypes;
	}
}



