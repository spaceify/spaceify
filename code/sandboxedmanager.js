/**
 * Sandboxed application manager, 18.10.2013 Spaceify Inc.
 *
 * @class SandboxedManager
 */

var fibrous = require("fibrous");
var config = require("./config")();
var utility = require("./utility");
var Manager = require("./manager");
var language = require("./language");
var Database = require("./database");
var Application = require("./application");

function SandboxedManager()
{
var self = this;

self.ordinal = 0;
self.applications = {};

var database = new Database();

utility.extendClass(new Manager(self), self);													// MAKE METHODS FROM MANAGER AVAILABLE TO THIS CLASS!!!

self.start = fibrous( function(unique_name, throw_errors)
	{
	var application = null;

	try {
		if(unique_name)																			// Start one named application
			db_applications = [database.sync.getApplication([unique_name], false)];
		else																					// Start all applications
			db_applications = database.sync.getApplication([config.SANDBOXED], true);

		for(var i=0; i<db_applications.length; i++)
			{
			build_application = self.find("application", db_applications[i].unique_name);			// Is application by this unique name alredy build?

			if(!build_application)
				application = self.build.sync(db_applications[i].docker_image_id, db_applications[i].unique_directory, db_applications[i].unique_name, config.SANDBOXED);
			else
				application = build_application;

			self.sync.run(application);

			if(!application.isInitialized() && throw_errors)
				throw utility.ferror(language.E_SANDBOXED_FAILED_INIT_ITSELF.p("SandboxedManager::start"), {":err": application.getInitializationError()});
			}
		}
	catch(err)
		{
		throw utility.error(err);
		}
	finally
		{
		database.close();
		}
	});

}

module.exports = SandboxedManager;
