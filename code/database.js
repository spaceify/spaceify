"use strict";

/**
 * Database, 17.1.2014 Spaceify Oy
 * 
 * The connection to the database is opened automatically and opening the connection is not necessary.
 * However, callers must close the database .
 *
 * @class Database
 */

var fs = require("fs");
var sqlite3 = require("sqlite3");
var fibrous = require("fibrous");
var language = require("./language");
var SpaceifyConfig = require("./spaceifyconfig");
var ValidateApplication = require("./validateapplication");
var SpaceifyUtility = require("./spaceifyutility");

function Database()
{
var self = this;

var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var db = null;

var transactions = 0;	// Global transaction. Sequentially called methods in classes must not start/commit/rollback their own transactions.

var validator = new ValidateApplication();

var openDB = function()
	{
	try {
		if(!db)
			db = new sqlite3.Database(config.SPACEIFY_DATABASE_FILE, sqlite3.OPEN_READWRITE);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_OPEN.pre("Database::open", err);
		}
	}

self.close = function()
	{
	if(db)
		db.close();
	db = null;
	}

var isOpen = function()
	{
	return (db ? true : false);
	}

self.begin = fibrous( function(str)
	{
	try {
		if(!isOpen())
			openDB();

		if(transactions == 0)
			db.sync.run("BEGIN TRANSACTION");
		transactions++;
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_BEGIN.pre("Database::begin", err);
		}
	});

self.commit = fibrous( function(str)
	{
	try {
		transactions--;
		if(transactions == 0)
			db.sync.run("COMMIT");
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_COMMIT.pre("Database::commit", err);
		}
	});

self.rollback = fibrous( function(str)
	{
	try {
		transactions--;
		if(transactions == 0)
			db.sync.run("ROLLBACK");
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_ROLLBACK.pre("Database::rollback", err);
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// APPLICATIONS - spaceify.db // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getApplication = fibrous( function(unique_name)
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM applications WHERE unique_name=?", [unique_name]);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_GET_APPLICATION.pre("Database::getApplication", err);
		}
	});

self.getApplications = fibrous( function(type)
	{
	var order;
	var where;
		
	try {
		if(!isOpen())
			openDB();

		order = " ORDER BY type, position ASC";

		where = "";
		for(var i = 0; i < type.length; i++)
			where += (where == "" ? " WHERE " : " OR ") + "type=?";

		return db.sync.all("SELECT * FROM applications" + where + order, type);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_GET_APPLICATIONS.pre("Database::getApplications", err);
		}
	});

self.insertApplication = fibrous( function(manifest)
	{
	var max;
	var params;
	var inject_enabled;
	var inject_identifier;

	try {
		if(!isOpen())
			openDB();

		max = db.sync.get("SELECT MAX(position) AS pos FROM applications WHERE type=?", [manifest.type]);

		inject_identifier = (manifest.type == config.SPACELET ? manifest.inject_identifier : "");
		inject_enabled = (manifest.type == config.SPACELET ? "1" : "0");
		params = [manifest.unique_name, validator.makeUniqueDirectory(manifest.unique_name), manifest.docker_image_id, manifest.type, manifest.version, utility.getLocalDateTime(), inject_identifier, inject_enabled, max.pos + 1];

		db.sync.run("INSERT INTO applications (unique_name, unique_directory, docker_image_id, type, version, install_datetime, inject_identifier, inject_enabled, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", params);

		addProvidedServices.sync(manifest);

		if(manifest.type == config.SPACELET)
			{
			addInjectHostnames.sync(manifest);
			addInjectFiles.sync(manifest);
			}
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_INSERT_APPLICATION.pre("Database::insertApplication", err);
		}
	});

self.updateApplication = fibrous( function(manifest)
	{
	var params;
	var inject_identifier;
		
	try {
		if(!isOpen())
			openDB();

		self.sync.begin();

		inject_identifier = (manifest.type == config.SPACELET ? manifest.inject_identifier : "");
		params = [validator.makeUniqueDirectory(manifest.unique_name), manifest.docker_image_id, manifest.version, utility.getLocalDateTime(), inject_identifier, manifest.unique_name];

		db.sync.run("UPDATE applications SET unique_directory=?, docker_image_id=?, version=?, install_datetime=?, inject_identifier=? WHERE unique_name=?", params);

		addProvidedServices.sync(manifest);

		if(manifest.type == config.SPACELET)
			{
			addInjectHostnames.sync(manifest);
			addInjectFiles.sync(manifest);
			}

		self.sync.commit();
		}
	catch(err)
		{
		self.sync.rollback();

		throw err;	//language.E_DATABASE_UPDATE_APPLICATION.pre("Database::updateApplication", err);
		}
	});

self.removeApplication = fibrous( function(unique_name)
	{
	var results;

	try {
		if(!isOpen())
			openDB();

		results = db.sync.get("SELECT type, position FROM applications WHERE unique_name=?", [unique_name]);

		db.sync.run("DELETE FROM inject_hostnames WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM inject_files WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM provided_services WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM applications WHERE unique_name=?", unique_name);
		db.sync.run("UPDATE applications SET position=position-1 WHERE position>? AND type=?", [results.position, results.type]);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_REMOVE_APPLICATION.pre("Database::removeApplication", err);
		}
	});

var addProvidedServices = fibrous( function(manifest)
	{
	var stmt;

	try {
		db.sync.run("DELETE FROM provided_services WHERE unique_name=?", manifest.unique_name);

		stmt = db.prepare("INSERT INTO provided_services (unique_name, service_name, service_type) VALUES(?, ?, ?)");

		for(var i = 0; i < manifest.provides_services.length; i++)
			stmt.sync.run([manifest.unique_name, manifest.provides_services[i].service_name, manifest.provides_services[i].service_type]);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_ADD_PROVIDED_SERVICES.pre("Database::addProvidedServices", err);
		}
	finally
		{
		if(stmt)
			stmt.finalize();
		}
	});

var addInjectHostnames = fibrous( function(manifest)
	{
	var stmt;
	var inject_hostname;

	try {
		db.sync.run("DELETE FROM inject_hostnames WHERE unique_name=?", manifest.unique_name);

		stmt = db.prepare("INSERT INTO inject_hostnames (unique_name, inject_hostname) VALUES(?, ?)");

		for(var i = 0; i < manifest.inject_hostnames.length; i++)
			{
			inject_hostname = manifest.inject_hostnames[i].replace("*", "%");			// IN MANIFEST: *.google.* -> CHANGED FOR SQLITE: %.google.%
			stmt.sync.run([manifest.unique_name, inject_hostname]);
			}
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_ADD_INJECT_HOSTNAMES.pre("Database::addInjectHostnames", err);
		}
	finally
		{
		if(stmt)
			stmt.finalize();
		}
	});

var addInjectFiles = fibrous( function(manifest)
	{
	var stmt;
	var file;
	var type;
	var order;
	var directory;
	var url_or_path;
	var application_path;

	try {
		db.sync.run("DELETE FROM inject_files WHERE unique_name=?", manifest.unique_name);

		stmt = db.prepare("INSERT INTO inject_files (unique_name, url_or_path, directory, file, inject_type, inject_order) VALUES(?, ?, ?, ?, ?, ?)");

		application_path = config.SPACELETS_PATH + validator.makeUniqueDirectory(manifest.unique_name) + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.WWW_DIRECTORY;

		order = 1;
		for(var i = 0; i < manifest.inject_files.length; i++)
			{
			directory = (manifest.inject_files[i].directory ? manifest.inject_files[i].directory.trim() : "");
			if(directory != "" && directory.search(/\/$/) == -1)
				directory += "/";
			file = manifest.inject_files[i].file.trim();
			type = manifest.inject_files[i].type.trim();

			url_or_path = (type == config.FILE ? application_path : config.EDGE_HOSTNAME + "/");				// Inject as URL or file

			stmt.sync.run([manifest.unique_name, url_or_path, directory, file, type, order++]);
			}
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_ADD_INJECT_FILENAMES.pre("Database::addInjectFiles", err);
		}
	finally
		{
		if(stmt)
			stmt.finalize();
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SERVICES  - spaceify.db // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.checkProvidedServices = fibrous( function(manifest)
	{ // Checks if applications manifest has provided services which are already registered by some other application.
	var row;
	var errors = [];

	try {
		if(!manifest.provides_services)
			return null;

		if(!isOpen())
			openDB();

		errors = [];
		for(var i = 0; i < manifest.provides_services.length; i++)
			{
			row = db.sync.get("SELECT * FROM provided_services WHERE service_name=? AND unique_name<>?", [manifest.provides_services[i].service_name, manifest.unique_name]);
			if(row)
				errors.push({service_name: row.service_name, unique_name: row.unique_name});
			}
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_CHECK_PROVIDED_SERVICES.pre("Database::checkProvidedServices", err);
		}

	return (errors.length > 0 ? errors : null);
	});

self.getService = fibrous( function(service_name)
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM provided_services LEFT JOIN applications ON applications.unique_name = provided_services.unique_name WHERE service_name=?", [service_name]);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_GET_SERVICE.pre("Database::getService", err);
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY CORE AND EDGE SETTINGS, INFROMATION - spaceify.db  // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getCoreSettings = fibrous( function()
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM settings");
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_GET_CORE_SETTINGS.pre("Database::getCoreSettings", err);
		}
	finally
		{
		self.close();
		}
	});

self.saveCoreSettings = fibrous( function(settings)
	{
	var value;
	var values = [];
	var columns = "";

	try {
		if(!isOpen())
			openDB();

		for(value in settings)
			{
			columns += (columns != "" ? ", " : "") + value + "=?";
			values.push(settings[value]);
			}

		db.sync.run("UPDATE settings SET " + columns, values);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_SAVE_CORE_SETTINGS.pre("Database::saveCoreSettings", err);
		}
	});

self.getEdgeSettings = fibrous( function()
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM user");
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_GET_EDGE_SETTINGS.pre("Database::getEdgeSettings", err);
		}
	});

self.saveEdgeSettings = fibrous( function(settings)
	{
	var value;
	var values = [];
	var columns = "";

	try {
		if(!isOpen())
			openDB();

		for(value in settings)
			{
			columns += (columns != "" ? ", " : "") + value + "=?";
			values.push(settings[value]);
			}

		db.sync.run("UPDATE user SET " + columns, values);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_SAVE_EDGE_SETTINGS.pre("Database::saveEdgeSettings", err);
		}
	});

self.getInformation = fibrous( function()
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM information");
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_GET_INFORMATION.pre("Database::getInformation", err);
		}
	finally
		{
		self.close();
		}
	});

self.adminLoggedIn = fibrous( function(params)
	{
	try {
		if(!isOpen())
			openDB();

		db.sync.run("UPDATE user SET admin_login_count = admin_login_count + 1, admin_last_login=?", params);
		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_ADMIN_LOGGED_IN.pre("Database::adminLoggedIn", err);
		}
	});


self.test = fibrous( function()
	{
	try {
		if(!isOpen())
			openDB();

		}
	catch(err)
		{
		throw err;	//language.E_DATABASE_TEST.pre("Database::removeApplication", err);
		}
	});

}

module.exports = Database;
