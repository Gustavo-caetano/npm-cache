'use strict';

var path = require('path');
var shell = require('shelljs');
var fs = require('fs');
var md5 = require('md5');
var logger = require('../util/logger');

//buffer clientVersion retrieving as it takes significant time
var npmVersion = undefined;
var options = {};

function getNpmMajorVersion() {
    return parseInt(getNpmVersion().split(/\./)[0] || 0, 10);
}

// Returns path to configuration file for npm. Uses
// - npm-shrinkwrap.json if it exists; otherwise,
// - package-lock.json if it exists and npm >= 5; otherwise,
// - defaults to package.json
var getNpmConfigPath = function () {
  var shrinkWrapPath = path.resolve(process.cwd(), 'npm-shrinkwrap.json');
  if (fs.existsSync(shrinkWrapPath)) {
    logger.logInfo('[npm] using npm-shrinkwrap.json instead of package.json');
    return shrinkWrapPath;
  }

  if (getNpmMajorVersion() >= 5) {
      var packageLockPath = path.resolve(process.cwd(), 'package-lock.json');
      if (fs.existsSync(packageLockPath)) {
          logger.logInfo('[npm] using package-lock.json instead of package.json');
          return packageLockPath;
      }
  }

  var packagePath = path.resolve(process.cwd(), 'package.json');
  return packagePath;
};

function getFileHash(filePath, installOptions) {
		var json = JSON.parse(fs.readFileSync(filePath));
		var toHash = {dependencies: json.dependencies};
    //making the hash a bit more robust when using npm - not all package.jsons are perfect.

		if (json.devDependencies) {
				toHash.devDependencies = json.devDependencies;
		}
		if (json.repository && json.repository.url) {
				toHash.repo = json.repository.url;
		}

		//important to add install options to this object a --production flag would cause a different node_modules structure.

		if (installOptions) {
				toHash.installOptions = installOptions;
		}


		var md5Hash = md5(JSON.stringify(toHash));

		return md5Hash;
}

function getNpmPostCachedInstallCommand() {
	var npmMajorVersion = getNpmMajorVersion();

	//npm run prepublish is only called for npm <= 4
	if (npmMajorVersion <= 4) {
		var packagePath = path.resolve(process.cwd(), 'package.json');
		var json = JSON.parse(fs.readFileSync(packagePath));
		if (json.scripts.prepublish)
			return 'npm run prepublish';
	}

  return null;
}

function getNpmVersion() {
	if (npmVersion === undefined) {
		npmVersion = shell.exec('npm --version', {silent: true}).output.trim();
	}
	return npmVersion;
}

function getNpmMajorVersion() {
	var npmMajorVersion = getNpmVersion();
	var pointPosition = npmMajorVersion.indexOf('.');
	if (pointPosition != -1) {
		npmMajorVersion = npmMajorVersion.substring(0,pointPosition);
	}
	return npmMajorVersion;
}

function getInstallCommand() {
	return options.ci ? 'npm ci' : 'npm install';
}

function setOptions(opts) {
	if (!opts) {
		return;
	}
	Object.assign(options, opts);
}

module.exports = {
  cliName: 'npm',
  getCliVersion: getNpmVersion,
  configPath: getNpmConfigPath(),
  installDirectory: 'node_modules',
  installCommand: getInstallCommand,
	getFileHash: getFileHash,
	postCachedInstallCommand: getNpmPostCachedInstallCommand(),
	setOptions: setOptions
};
