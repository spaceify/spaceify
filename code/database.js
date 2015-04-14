/**
 * Database, 17.1.2014, Spaceify Inc.
 * 
 * @class Database
 */

var fs = require("fs");
var fibrous = require("fibrous");
var Config = require("./config")();
var Utility = require("./utility");
var Language = require("./language");
var sqlite3 = require("sqlite3");

function Database()
{
var self = this;

var db = null;
var transactions = 0;													// call many times but set (the first caller), commit or rollback (the last caller, which is the one who calls set first), only once

self.open = function(dp_path)
	{
	try {
		if(!db)
			db = new sqlite3.Database(dp_path, sqlite3.OPEN_READWRITE);
		}
	catch(err)
		{
			Utility.error(Language.E_DATABASE_OPEN.p("Database::open"), err);
		throw err;
		}
	}

self.close = function()
	{
	if(db)
		db.close();
	db = null;
	}

self.begin = fibrous( function(str)
	{
	try {
		if(transactions == 0)
			db.sync.run("BEGIN TRANSACTION");
		transactions++;
		}
	catch(err)
		{
			Utility.error(Language.E_DATABASE_BEGIN.p("Database::begin"), err);
		throw err;
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
			Utility.error(Language.E_DATABASE_COMMIT.p("Database::commit"), err);
		throw err;
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
			Utility.error(Language.E_DATABASE_ROLLBACK.p("Database::rollback"), err);
		throw err;
		}
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// APPLICATIONS - spaceify.db // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getApplication = fibrous( function(params, bAll)
	{
	try {
		if(!bAll)
			return db.sync.get("SELECT * FROM applications WHERE unique_name=?", params);			// One specific application
		else
			return db.sync.all("SELECT * FROM applications WHERE type=?", params);					// All applications of the type
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_GETAPPLICATION.p("Database::getApplication"), err);
		throw err;
		}
	});

self.getApplications = fibrous( function(type)
	{
	try {
		order = " ORDER BY (CASE type";
		if(type.length == 0)
			order += " WHEN '" + Config.SPACELET + "' THEN 0 WHEN '" + Config.SANDBOXED + "' THEN 1 WHEN '" + Config.NATIVE + "' THEN 2 END)";
		else
			{
			for(var i=0; i<type.length; i++)
				order += " WHEN '" + Config.SHORT_APPLICATION_TYPES[type[i]] + "' THEN " + i;
			order += " END)";
			}

		where = "";
		for(var i=0; i<type.length; i++)
			{
			where += (where == "" ? " WHERE " : " OR ") + "type=?";
			type[i] = Config.SHORT_APPLICATION_TYPES[type[i]];
			}

		return db.sync.all("SELECT * FROM applications" + where + order, type);
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_GETAPPLICATIONS.p("Database::getApplications"), err);
		throw err;
		}
	});

self.insertApplication = fibrous( function(manifest)
	{
	try {
		self.sync.begin();

		var inject_identifier = (manifest.type == Config.SPACELET ? manifest.inject_identifier : "");
		var inject_enabled = (manifest.type == Config.SPACELET ? "1" : "0");
		var params = [manifest.unique_name, manifest.unique_directory, manifest.docker_image_id, manifest.type, manifest.version, Utility.getLocalDateTime(), inject_identifier, inject_enabled];

		db.sync.run("INSERT INTO applications (unique_name, unique_directory, docker_image_id, type, version, install_datetime, inject_identifier, inject_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", params);

		addProvidedServices.sync(manifest);

		if(manifest.type == Config.SPACELET)
			{
			addInjectHostnames.sync(manifest);
			addInjectFiles.sync(manifest);
			}

		self.sync.commit();
		}
	catch(err)
		{
		self.sync.rollback();
		Utility.error(Language.E_DATABASE_INSERTAPPLICATION.p("Database::insertApplication"), err);
		throw err;
		}
	});

self.updateApplication = fibrous( function(manifest)
	{
	try {
		self.sync.begin();

		var inject_identifier = (manifest.type == Config.SPACELET ? manifest.inject_identifier : "");
		var params = [manifest.unique_directory, manifest.docker_image_id, manifest.version, Utility.getLocalDateTime(), inject_identifier, manifest.unique_name];

		db.sync.run("UPDATE applications SET unique_directory=?, docker_image_id=?, version=?, install_datetime=?, inject_identifier=? WHERE unique_name=?", params);

		addProvidedServices.sync(manifest);

		if(manifest.type == Config.SPACELET)
			{
			addInjectHostnames.sync(manifest);
			addInjectFiles.sync(manifest);
			}

		self.sync.commit();
		}
	catch(err)
		{
		self.sync.rollback();
		Utility.error(Language.E_DATABASE_UPDATEAPPLICATION.p("Database::updateApplication"), err);
		throw err;
		}
	});

self.removeApplication = fibrous( function(unique_name)
	{
	try {
		db.sync.run("DELETE FROM inject_hostnames WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM inject_files WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM provided_services WHERE unique_name=?", unique_name);
		db.sync.run("DELETE FROM applications WHERE unique_name=?", unique_name);		
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_REMOVEAPPLICATION.p("Database::removeApplication"), err);
		throw err;
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

		stmt = db.prepare("INSERT INTO inject_files (unique_name, url_or_path, directory, file, inject_type, inject_order, is_spaceify) VALUES(?, ?, ?, ?, ?, ?, 0)");

		application_path = Config.SPACELETS_PATH + manifest.unique_directory + Config.VOLUME_DIRECTORY + Config.APPLICATION_DIRECTORY + Config.WWW_DIRECTORY;

		var order = 1;
		for(var i=0; i<manifest.inject_files.length; i++)
			{
			var directory = (manifest.inject_files[i].directory ? manifest.inject_files[i].directory.trim() : "");
			if(directory != "" && directory.search(/\/$/) == -1)
				directory += "/";
			var file = manifest.inject_files[i].file.trim();
			var type = manifest.inject_files[i].type.trim();

			var url_or_path = (type == Config.JAVASCRIPT || type == Config.CSS ? Config.WWW_URL : application_path);		// Inject as url or file

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
	if(!manifest.provides_services)
		return null;

	var errors = [];
	for(var i=0; i<manifest.provides_services.length; i++)
		{
		var row = db.sync.get("SELECT * FROM provided_services WHERE service_name=? AND unique_name<>?", [manifest.provides_services[i].service_name, manifest.unique_name]);
		if(row)
			errors.push({service_name: row.service_name, unique_name: row.unique_name});
		}

	return (errors.length > 0 ? errors : null);
	});

self.getService = fibrous( function(service_name)
	{
	return db.sync.get("SELECT * FROM provided_services LEFT JOIN applications ON applications.unique_name = provided_services.unique_name WHERE service_name=?", [service_name]);
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// SPACEIFY CORE SETTINGS - spaceify.db   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.updateSettings = fibrous( function(params, inject_files)
	{
	try {
		db.sync.run("UPDATE settings SET language=?", params);
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_UPDATESETTINGS.p("Database::updateSettings"), err);
		throw err;
		}
	});

self.getSettings = fibrous( function()
	{
	try {
		return db.sync.get("SELECT * FROM settings");
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_GETSETTINGS.p("Database::getSettings"), err);
		throw err;
		}
	});

self.getSetting = fibrous( function(setting, defaultVal, bThrows)
	{ // Open/close database automatically if not already opened. Default value is returned if getting the setting from the database fails.
	var bOpened = false;
	var settings = null;

	try {
		if(!db)
			{
			self.open(Config.SPACEIFY_DATABASE_FILE);
			bOpened = true;
			}

		settings = self.sync.getSettings();
		}
	catch(err)
		{
		if(bThrows)
		Utility.error(Language.E_DATABASE_GETSETTING.p("Database::getSetting"), err);
		throw err;
		}
	finally
		{
		if(bOpened)
			self.close();
		}

	return (settings && settings[setting] ? settings[setting] : (defaultVal ? defaultVal : null));
	});

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
// EDGE USER  - spaceify.db   // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
self.getUserData = fibrous( function()
	{
	try {
		return db.sync.get("SELECT * FROM user");
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_GETUSERDATA.p("Database::getUserData"), err);
		throw err;
		}
	});

self.adminLoggedIn = fibrous( function(params)
	{
	try {
		db.sync.run("UPDATE user SET admin_login_count = admin_login_count + 1, admin_last_login=?", params);
		}
	catch(err)
		{
		Utility.error(Language.E_DATABASE_ADMINLOGGEDIN.p("Database::adminLoggedIn"), err);
		throw err;
		}
	});

}

module.exports = Database;
