/**
 * Database, 17.1.2014, Spaceify Inc.
 * 
 * The connection to the database is opened automatically and opening the connection is not necessary.
 * However, callers must close the database .
 *
 * @class Database
 */

var fs = require("fs");
var fibrous = require("fibrous");
var config = require("./config")();
var utility = require("./utility");
var language = require("./language");
var sqlite3 = require("sqlite3");

function Database()
{
var self = this;

var db = null;

var transactions = 0;	// Global transaction. Sequentially called methods in classes must not start/commit/rollback their own transactions.

var openDB = function()
	{
	try {
		if(!db)
			db = new sqlite3.Database(config.SPACEIFY_DATABASE_FILE, sqlite3.OPEN_READWRITE);
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_OPEN.p("Database::open"), err);
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
		throw err;	//utility.error(language.E_DATABASE_BEGIN.p("Database::begin"), err);
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
		throw err;	//utility.error(language.E_DATABASE_COMMIT.p("Database::commit"), err);
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
		throw err;	//utility.error(language.E_DATABASE_ROLLBACK.p("Database::rollback"), err);
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// APPLICATIONS - spaceify.db // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getApplication = fibrous( function(params, bAll)
	{
	try {
		if(!isOpen())
			openDB();

		if(!bAll)
			return db.sync.get("SELECT * FROM applications WHERE unique_name=?", params);			// One specific application
		else
			return db.sync.all("SELECT * FROM applications WHERE type=?", params);					// All applications of the type
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_GET_APPLICATION.p("Database::getApplication"), err);
		}
	});

self.getApplications = fibrous( function(type)
	{
	try {
		if(!isOpen())
			openDB();

		order = " ORDER BY (CASE type";
		if(type.length == 0)
			order += " WHEN '" + config.SPACELET + "' THEN 0 WHEN '" + config.SANDBOXED + "' THEN 1 WHEN '" + config.NATIVE + "' THEN 2 END)";
		else
			{
			for(var i=0; i<type.length; i++)
				order += " WHEN '" + config.SHORT_APPLICATION_TYPES[type[i]] + "' THEN " + i;
			order += " END)";
			}

		where = "";
		for(var i=0; i<type.length; i++)
			{
			where += (where == "" ? " WHERE " : " OR ") + "type=?";
			type[i] = config.SHORT_APPLICATION_TYPES[type[i]];
			}

		return db.sync.all("SELECT * FROM applications" + where + order, type);
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_GET_APPLICATIONS.p("Database::getApplications"), err);
		}
	});

self.insertApplication = fibrous( function(manifest)
	{
	try {
		if(!isOpen())
			openDB();

		var inject_identifier = (manifest.type == config.SPACELET ? manifest.inject_identifier : "");
		var inject_enabled = (manifest.type == config.SPACELET ? "1" : "0");
		var params = [manifest.unique_name, manifest.unique_directory, manifest.docker_image_id, manifest.type, manifest.version, utility.getLocalDateTime(), inject_identifier, inject_enabled];

		db.sync.run("INSERT INTO applications (unique_name, unique_directory, docker_image_id, type, version, install_datetime, inject_identifier, inject_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", params);

		addProvidedServices.sync(manifest);

		if(manifest.type == config.SPACELET)
			{
			addInjectHostnames.sync(manifest);
			addInjectFiles.sync(manifest);
			}
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_INSERT_APPLICATION.p("Database::insertApplication"), err);
		}
	});

self.updateApplication = fibrous( function(manifest)
	{
	try {
		if(!isOpen())
			openDB();

		self.sync.begin();

		var inject_identifier = (manifest.type == config.SPACELET ? manifest.inject_identifier : "");
		var params = [manifest.unique_directory, manifest.docker_image_id, manifest.version, utility.getLocalDateTime(), inject_identifier, manifest.unique_name];

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

		throw err;	//utility.error(language.E_DATABASE_UPDATE_APPLICATION.p("Database::updateApplication"), err);
		}
	});

self.removeApplication = fibrous( function(unique_name)
	{
	try {
		if(!isOpen())
			openDB();

		db.sync.run("DELETE FROM inject_hostnames WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM inject_files WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM provided_services WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM applications WHERE unique_name=?", unique_name);		
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_REMOVE_APPLICATION.p("Database::removeApplication"), err);
		}
	});

var addProvidedServices = fibrous( function(manifest)
	{
	var stmt;

	try {
		db.sync.run("DELETE FROM provided_services WHERE unique_name=?", manifest.unique_name);

		stmt = db.prepare("INSERT INTO provided_services (unique_name, service_name, service_type) VALUES(?, ?, ?)");

		for(var i=0; i<manifest.provides_services.length; i++)
			stmt.sync.run([manifest.unique_name, manifest.provides_services[i].service_name, manifest.provides_services[i].service_type]);
		}
	catch(err)
		{
		throw err;
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

	try {
		db.sync.run("DELETE FROM inject_hostnames WHERE unique_name=?", manifest.unique_name);

		stmt = db.prepare("INSERT INTO inject_hostnames (unique_name, inject_hostname) VALUES(?, ?)");

		for(var i=0; i<manifest.inject_hostnames.length; i++)
			{
			var inject_hostname = manifest.inject_hostnames[i].replace("*", "%");			// IN MANIFEST: *.google.* -> CHANGED FOR SQLITE: %.google.%
			stmt.sync.run([manifest.unique_name, inject_hostname]);
			}
		}
	catch(err)
		{
		throw err;
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

	try {
		db.sync.run("DELETE FROM inject_files WHERE unique_name=?", manifest.unique_name);

		stmt = db.prepare("INSERT INTO inject_files (unique_name, url_or_path, directory, file, inject_type, inject_order) VALUES(?, ?, ?, ?, ?, ?)");

		application_path = config.SPACELETS_PATH + manifest.unique_directory + config.VOLUME_DIRECTORY + config.APPLICATION_DIRECTORY + config.WWW_DIRECTORY;

		var order = 1;
		for(var i=0; i<manifest.inject_files.length; i++)
			{
			var directory = (manifest.inject_files[i].directory ? manifest.inject_files[i].directory.trim() : "");
			if(directory != "" && directory.search(/\/$/) == -1)
				directory += "/";
			var file = manifest.inject_files[i].file.trim();
			var type = manifest.inject_files[i].type.trim();

			var url_or_path = (type == config.FILE ? application_path : config.EDGE_IP + "/");			// Inject as URL or file

			stmt.sync.run([manifest.unique_name, url_or_path, directory, file, type, order++]);
			}
		}
	catch(err)
		{
		throw err;
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
	try {
		if(!manifest.provides_services)
			return null;

		if(!isOpen())
			openDB();

		var errors = [];
		for(var i=0; i<manifest.provides_services.length; i++)
			{
			var row = db.sync.get("SELECT * FROM provided_services WHERE service_name=? AND unique_name<>?", [manifest.provides_services[i].service_name, manifest.unique_name]);
			if(row)
				errors.push({service_name: row.service_name, unique_name: row.unique_name});
			}
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_UPDATEAPPLICATION.p("Database::updateApplication"), err);
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
		throw err;	//utility.error(language.E_DATABASE_UPDATEAPPLICATION.p("Database::updateApplication"), err);	
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY CORE SETTINGS - spaceify.db   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.updateSettings = fibrous( function(params)
	{
	try {
		if(!isOpen())
			openDB();

		db.sync.run("UPDATE settings SET language=?", params);
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_UPDATE_SETTINGS.p("Database::updateSettings"), err);
		}
	});

self.getSettings = fibrous( function()
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM settings");
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_GET_SETTINGS.p("Database::getSettings"), err);
		}
	finally
		{
		self.close();
		}
	});

self.getSetting = fibrous( function(setting, defaultVal, bThrows)
	{
	var bThisOpened = false;
	var settings = null;

	try {
		if(!isOpen())
			openDB();

		settings = self.sync.getSettings();
		}
	catch(err)
		{
		if(bThrows)
			throw err;	//utility.error(language.E_DATABASE_GET_SETTING.p("Database::getSetting"), err);
		}
	finally
		{
		self.close();
		}

	return (settings && settings[setting] ? settings[setting] : (defaultVal ? defaultVal : null));
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// EDGE USER  - spaceify.db   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getUserData = fibrous( function()
	{
	try {
		if(!isOpen())
			openDB();

		return db.sync.get("SELECT * FROM user");
		}
	catch(err)
		{
		throw err;	//utility.error(language.E_DATABASE_GET_USERDATA.p("Database::getUserData"), err);
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
		throw err;	//utility.error(language.E_DATABASE_ADMIN_LOGGED_IN.p("Database::adminLoggedIn"), err);
		}
	});

}

module.exports = Database;
