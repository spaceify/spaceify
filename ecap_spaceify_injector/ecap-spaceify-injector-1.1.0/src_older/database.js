/**
 * Database, 17.1.2014, Spaceify Inc.
 * 
 * @class Database
 */

var logger = require('winston');
var fibrous = require("fibrous");
var Config = require("./config");
var Const = require("./constants");
var sqlite3 = require("sqlite3");

function Database()
{
var self = this;

var db = null;

self.open = fibrous(function()
	{
	try {
		if(!db)
			db = new sqlite3.Database(Config.DATABASE_FILEPATH, sqlite3.OPEN_READWRITE);
		}
	catch(err)
		{
		throw err;
		}
	});

self.close = fibrous(function()
	{
	if(db)
		db.close();
	db = null;
	});

var begin = fibrous(function(str)
	{
	try {
		db.sync.run("BEGIN TRANSACTION");
	}
	catch(err)
		{
		throw err;
		}
	});

var commit = fibrous(function(str)
	{
	try {
		db.sync.run("COMMIT");
		}
	catch(err)
		{
		throw err;
		}
	});

var rollback = fibrous(function(str)
	{
	try {
		db.sync.run("ROLLBACK");
		}
	catch(err)
		{
		throw err;
		}
	});

/* ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** */
self.getApplication = fibrous(function(params)
	{
	try {
		return db.sync.get("SELECT id FROM applications WHERE name=?", params);
		}
	catch(err)
		{
		throw err;
		}
	});

self.insertApplication = fibrous(function(params, inject_urls)
	{
	try {
		begin.sync();

		db.sync.run("INSERT INTO applications (name, version, type, inject_identifier, inject_text, inject_enabled) VALUES (?, ?, ?, ?, ?, ?)", params);

		var obj = db.sync.get("SELECT last_insert_rowid() AS last_id");

		addInjectUrls.sync(obj.last_id, inject_urls);

		commit.sync();
		}
	catch(err)
		{
		rollback.sync();
		throw err;
		}
	});

self.updateApplication = fibrous(function(params, inject_urls)
	{
	try {
		begin.sync();

		db.sync.run("UPDATE applications SET version=?, inject_identifier=?, inject_text=? WHERE id=?", params);

		addInjectUrls(aid, inject_urls);

		commit.sync();
		}
	catch(err)
		{
		rollback.sync();
		throw err;
		}
	});

var addInjectUrls = fibrous(function(id, inject_urls)
	{
	db.sync.run("DELETE FROM inject_urls WHERE applications_id=?", id);

	var stmt = db.prepare("INSERT INTO inject_urls (applications_id, inject_url) VALUES(?, ?)");

	for(i in inject_urls)
		{
		inject_urls[i] = inject_urls[i].replace("*", "%");				// GUI: *.google.* -> SQLITE: %.google.%
		stmt.sync.run([id, inject_urls[i]]);
		}
	});

self.updateSettings = fibrous(function(params)
	{
	try {
		db.sync.run("UPDATE settings SET inject_spaceifyclient=?", params);
		}
	catch(err)
		{
		throw err;
		}
	});

}

module.exports = Database;
