'use strict';

const utils = require('util');
const keySSISpace = require('./../../keyssi');
const notifications = require('./../../notifications');

/**
 * Common test helpers
 */
const createKeySSI = (domain) => {
	domain = domain || 'default';
	return new Promise((resolve, reject) => {
		keySSISpace.createTemplateSeedSSI('default', (err, templateKeySSI) => {
			if (err) {
				return reject(err);
			}
			templateKeySSI.initialize(templateKeySSI.getDLDomain(), undefined, undefined, undefined, templateKeySSI.getHint(), (err, keySSI) => {
				if (err) {
					return reject(err);
				}
				resolve(keySSI);
			});
		});
	})
}

const delay = (delay) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, delay);
	})
}

const promisifyPublish = () => {
	return utils.promisify(notifications.publish);
}

module.exports = {
	createKeySSI,
	delay,
	promisifyPublish
}
