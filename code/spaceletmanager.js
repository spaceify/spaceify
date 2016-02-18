/**
 * Spacelet Manager, 2013 Spaceify Inc.
 *
 * @class SpaceletManager
 */

var fibrous = require("fibrous");
var config = require("./config")();
var utility = require("./utility");
var Manager = require("./manager");
var language = require("./language");
var Database = require("./database");
var Application = require("./application");

function SpaceletManager()
{
var self = this;

self.ordinal = 0;
self.applications = {};

var database = new Database();

utility.extendClass(new Manager(self), self);													// MAKE METHODS FROM MANAGER AVAILABLE TO THIS CLASS!!!

self.start = fibrous( function(unique_name, run_spacelet, throw_errors)
	{
	var application = null;

	try {
		if(unique_name)																		// Build one application
			db_applications = [database.sync.getApplication(unique_name)];
		else																				// Build all applications
			db_applications = database.sync.getApplications([config.SPACELET]);

		for(var i=0; i<db_applications.length; i++)
			{
			var build_application = self.find("application", db_applications[i].unique_name);	// Is application by this unique name alredy build?

			if(!build_application)
				application = self.build.sync(db_applications[i].docker_image_id, db_applications[i].unique_directory, db_applications[i].unique_name, config.SPACELET);
			else
				application = build_application;

			if(run_spacelet)
				self.sync.run(application);

			if(!application.isInitialized() && run_spacelet && throw_errors)
				throw utility.ferror(language.E_SPACELET_FAILED_INIT_ITSELF.p("SpaceletManager::start"), {":err": application.getInitializationError()});
			}
		}
	catch(err)
		{
		throw(err);
		}
	finally
		{
		database.close();
		}

	return (unique_name ? application : null);
	});

}

module.exports = SpaceletManager;

// SHARE SPACELET OR START A NEW - SPACELETS ARE SHARED NOW BY DEFAULT
//if(!build_application || (build_application && !build_application.isShared()))	// 'No' OR 'yes and is not shared' -> add the build application to the applications
//	{
//	application = self.build.sync(..........);
//	add(application);
//	}
//else if(build_application && build_application.isShared())						// 'Yes and is shared' -> use the existing application
//	application = build_application;

