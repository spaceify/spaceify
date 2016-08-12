"use strict";

/**
 * edge.spaceify.net, 1.8.2016 Spaceify Oy
 *
 * edge.id format
 *   edge_id, edge_name, edge_password, edge_salt, edge_enable_remote, edge_require_password
 *
 * Deprecated edge_id.uiid format (only edge_id is usable)
 * edge_id, edge_password
 *
 * @class EdgeSpaceifyNet
 */

var fs = require("fs");
var crypto = require("crypto");
var fibrous = require("fibrous");
var Database = require("./database");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");

function EdgeSpaceifyNet()
{
var self = this;

var database = new Database();
var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var EDGE_PASSWORD_SALT_REGX = /^[0-9a-f]{128}$/;
var EDGE_NAME_REGX = /^[a-zA-Z0-9]{4,32}$/;
var EDGE_ID_REGX = /^([0-9a-f]{8}-)([0-9a-f]{4}-){3}([0-9a-f]{12})$/;

var EDGE_NAME_FILE = "/var/lib/spaceify/data/db/edge_name";

self.createEdgeId = fibrous( function(throws)
	{
	var edgeIdFile, newEdgeId, edgeSettings, parts;
	var edge_id, edge_name, edge_password, edge_salt, edge_enable_remote, edge_require_password;

	try {
		// File or Database -- -- -- -- -- -- -- -- -- --
		newEdgeId = createNewId("array");

		if(utility.sync.isLocal(config.SPACEIFY_REGISTRATION_FILE_TMP, "file"))		// Use existing registration file
			{
			edgeIdFile = fs.sync.readFile(config.SPACEIFY_REGISTRATION_FILE_TMP, {encoding: "utf8"});
			parts = edgeIdFile.split(",");

			edge_id = (parts.length == 2 || parts.length == 6 ? parts[0] : newEdgeId[0]);	// edge_id can be from the old edge_id.uuid file or the new edge.id file
			edge_name = (parts.length == 6 ? parts[1] : newEdgeId[1]);
			edge_password = (parts.length == 6 ? parts[2] : newEdgeId[2]);
			edge_salt = (parts.length == 6 ? parts[3] : newEdgeId[3]);
			edge_enable_remote = (parts.length == 6 ? parts[4] : newEdgeId[4]);
			edge_require_password = (parts.length == 6 ? parts[5] : newEdgeId[5]);
			}
		else																		// Get the values from the database or use the created values
			{																		// if the values in the database are invalid
			edgeSettings = database.sync.getEdgeSettings();

			edge_id = (edgeSettings.hasOwnProperty("edge_id") && edgeSettings.edge_id ? edgeSettings.edge_id : newEdgeId[0]);
			edge_name = (edgeSettings.hasOwnProperty("edge_name") && edgeSettings.edge_name ? edgeSettings.edge_name : newEdgeId[1]);
			edge_password = (edgeSettings.hasOwnProperty("edge_password") && edgeSettings.edge_password ? edgeSettings.edge_password : newEdgeId[2]);
			edge_salt = (edgeSettings.hasOwnProperty("edge_salt") && edgeSettings.edge_salt ? edgeSettings.edge_salt : newEdgeId[3]);
			edge_enable_remote = (edgeSettings.hasOwnProperty("edge_enable_remote") && edgeSettings.edge_enable_remote? edgeSettings.edge_enable_remote : newEdgeId[4]);
			edge_require_password = (edgeSettings.hasOwnProperty("edge_require_password") && edgeSettings.edge_require_password ? edgeSettings.edge_require_password : newEdgeId[5]);
			}

		if(utility.sync.isLocal(EDGE_NAME_FILE, "file"))							// Use edge name from file if it exists
			edge_name = fs.sync.readFile(EDGE_NAME_FILE, {encoding: "utf8"});

		edge_id = (edge_id.match(EDGE_ID_REGX) ? edge_id : newEdgeId[0]);			// Validate values
		edge_name = (edge_name.match(EDGE_NAME_REGX) ? edge_name : newEdgeId[1]);
		edge_password = (edge_password.match(EDGE_PASSWORD_SALT_REGX) ? edge_password : newEdgeId[2]);
		edge_salt = (edge_salt.match(EDGE_PASSWORD_SALT_REGX) ? edge_salt : newEdgeId[3]);
		edge_enable_remote = (edge_enable_remote == 0 || edge_enable_remote == 1 ? edge_enable_remote : newEdgeId[4]);
		edge_require_password = (edge_require_password == 0 || edge_require_password == 1 ? edge_require_password : newEdgeId[5]);

		parts = [edge_id, edge_name, edge_password, edge_salt, edge_enable_remote, edge_require_password];

		fs.sync.writeFile(config.SPACEIFY_REGISTRATION_FILE, parts.join(","), {encoding: "utf8"});

		edgeSettings = {edge_id: parts[0], edge_name: parts[1], edge_password: parts[2], edge_salt: parts[3], edge_enable_remote: parts[4], edge_require_password: parts[5]};
		database.sync.saveEdgeSettings(edgeSettings);

		if(utility.sync.isLocal(EDGE_NAME_FILE, "file"))							// Remove edge_name file only if saving the data is successful
			fs.sync.unlink(EDGE_NAME_FILE);

		if(!throws)
			console.log("\nOK");
		}
	catch(err)
		{
		err = errorc.make(err);

		if(!throws)
			{
			console.log("\nRegistering this edge node failed:", err.message, ". The registration is required for some operations of");
			console.log("the Spaceify core and it is highly recommended to finish the registration. Try to finish the registration manually");
			console.log("by running the command: spm register\n");
			}
		else
			throw err;
		}
	finally
		{
		database.close();
		}
/*
	# -- Check/print registration status -- #
if [ $registration_attempt -eq 5 ]; then

	printf "\nRegistering this edge node failed: ${registration_result}. The registration is required for some operations of\n"
	printf "the Spaceify core and it is highly recommended to finish the registration. Try to finish the registration manually\n"
	printf "by running command: spm register\n"

elif [ $registration_attempt -gt 0 ] && [ $registration_attempt -lt 5 ]; then

	printf "\nThis edge node was registered successfully with the edge id ${edge_uuid}.\n"
	printf "The registration file edge.id can be found from /var/lib/spaceify/data/db\n"
	printf "Consider storing this file in a secure location for possible future use.\n"
	printf "The registration file can be used to set or change registration when Spaceify is installed or updated.\n"
	printf "By placing the file to /tmp, before updating or installing, Spaceify uses it to register itself instead\n"
	printf "of using its previous registration or creating a new registration.\n"
	printf "Notice! Do not use the same registration on multiple edge nodes.\n"

else

	printf "\nExisting registration file, containing edge id ${edge_uuid}, was found and is used to identify this edge node.\n"

fi
*/
	});

var createNewId = function(type)
	{
	var data1 = crypto.randomBytes(4);
	var data2 = crypto.randomBytes(2);
	var data3 = crypto.randomBytes(2);
	var data4i = crypto.randomBytes(2);
	var data4r = crypto.randomBytes(6);
	var edge_id = data1.toString("hex") + "-" + data2.toString("hex") + "-" + data3.toString("hex") + "-" + data4i.toString("hex") + "-" + data4r.toString("hex");

	var edge_name = "";

	var edge_password = "";

	var edge_salt = crypto.createHash("sha512");
		edge_salt.update(crypto.randomBytes(64));
		edge_salt = edge_salt.digest("hex").toString();

	var edge_enable_remote = 0;

	var edge_require_password = 1;

	var newEdgeId = [edge_id, edge_name, edge_password, edge_salt, edge_enable_remote, edge_require_password];

	return (type == "string" ? newEdgeId.join(",") : newEdgeId);
	}

}

if(process.argv.length == 3 && process.argv[2] == "createEdgeId")
	{
	fibrous.run( function()
		{
		var edgeSpaceifyNet = new EdgeSpaceifyNet();
		edgeSpaceifyNet.sync.createEdgeId(false);
		}, function(err, data) {} );
	}

module.exports = EdgeSpaceifyNet;