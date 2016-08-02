/**
 * ValidateApplication, 2015 Spaceify Oy
 * 
 * A class for checking package validity before installing it.
 * 
 * @class ValidateApplication
 */

var mmm = require("mmmagic");
var fibrous = require("fibrous");
var language  = require("./language");
var SpaceifyError = require("./spaceifyerror");
var SpaceifyConfig = require("./spaceifyconfig");
var SpaceifyUtility = require("./spaceifyutility");

function ValidateApplication()
{
var self = this;

var errorc = new SpaceifyError();
var config = new SpaceifyConfig();
var utility = new SpaceifyUtility();

var errors = [];
var rules = null;
var unique_values = [];

self.validatePackage = fibrous( function(package_path, save_path_manifest)
	{
	try {
		errors = [];
		rules = null;
		unique_values = [];

		package_path += (package_path.search(/\/$/) != -1 ? "" : "/");
		var application_path = package_path + config.APPLICATION_DIRECTORY;
		var manifest_path = application_path + config.MANIFEST;

		// REQUIRED DIRECTORIES AND FILES
		if(!utility.sync.isLocal(application_path, "directory"))
			throw language.E_NO_APPLICATION_DIRECTORY.pre("ValidateApplication::validate");

		if(!utility.sync.isLocal(manifest_path, "file"))
			throw language.E_NO_MANIFEST_FILE.pre("ValidateApplication::validate");

		// VALIDATE MANIFEST
		var manifest = self.validateManifestFile.sync(manifest_path);

		// VALIDATE DIRECTORIES AND FILES IN THE PACKAGE
		if(errors.length == 0)
			self.validateDirectories.sync(application_path, manifest);

		// SAVE MANIFEST IF SAVE PATH IS SET
		if(save_path_manifest && errors.length == 0)
			utility.sync.saveJSON(save_path_manifest + config.MANIFEST, manifest, true);
		}
	catch(err)
		{
		addError(err)
		}

	if(errors.length > 0)																			// Throw all errors at once
		throw errors;

	return manifest;
	});

self.validateDirectories = fibrous( function(application_path, manifest)
	{ // CHECKS THAT THE FILES DEFINED IN THE MANIFEST ARE IN THE PACKAGE
	var i, obj, type, path = "", image, mtype;

	try {
		if(manifest.type == config.SPACELET)												// inject_files
			{
			for(i = 0; i < manifest.inject_files.length; i++)
				{
				obj = manifest.inject_files[i];

				path = utility.preparePath(obj.directory ? obj.directory : "");
				if(!utility.sync.isLocal(application_path + config.WWW_DIRECTORY + path + obj.file, "file"))
					addError( language.E_INJECT_FILE.preFmt("ValidateApplication::validateDirectories", {"~file": path + obj.file, "~directory": config.APPLICATION_DIRECTORY + config.WWW_DIRECTORY + path + obj.file}) );
				}
			}

		if(manifest.images)																	// images
			{
			var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

			for(i = 0; i < manifest.images.length; i++)
				{
				obj = manifest.images[i];

				path = utility.preparePath(obj.directory ? obj.directory : "");
				image = application_path + config.IMAGE_DIRECTORY + path + obj.file;

				if(!utility.sync.isLocal(image, "file"))
					addError( language.E_IMAGE_FILE.preFmt("ValidateApplication::validateDirectories", {"~file": obj.file, "~directory": obj.directory}) );
				else
					{
					mtype = magic.sync.detectFile(image);

					type = obj.file.split(".");
					if(config.IMAGE_TYPES.indexOf(mtype) == -1)
						addError( language.E_IMAGE_TYPES.pre("ValidateApplication::validateDirectories") );
					}
				}
			}

		if(manifest.docker_image)														// Dockerfile
			{
			if(!utility.sync.isLocal(application_path + config.DOCKERFILE, "file"))
				addError( language.E_DOCKER_IMAGE.pre("ValidateApplication::validateDirectories") );
			}
		}
	catch(err)
		{
		throw err;
		}
	});

self.validateManifestFile = fibrous( function(manifest_path)
	{
	var manifest = {};

	try {
		manifest = utility.sync.loadJSON(manifest_path, true, true);

		self.validateManifest.sync(manifest);
		}
	catch(err)
		{
		throw err;
		}

	return manifest;
	});

self.validateManifest = fibrous( function(manifest)
	{
	var i, j, rule, rule_errors, sub_rule, sub_rule_errors, required, type, value, is_required, is_set, is_type, objects, object, field, sub_rule_field, field_errors;

	rules = utility.sync.loadJSON(config.SPACEIFY_MANIFEST_RULES_FILE, true, true);						// Get the manifest validation rules

	if(!manifest.type || rules.lists.application_types.indexOf(manifest.type) == -1)					// Manifest must have the type field
		throw language.E_MANIFEST_TYPE.pre("ValidateApplication::validateManifest");

	// FOR EACH MANIFEST FIELD THERE IS A DIFFERENT SET OF RULES
	for(field in rules.rules)
		{
		rule = rules.rules[field];

		required = (rule.required == "all" || rule.required == manifest.type ? true : false);			// Field required by all, specific application type or none
		type = rule.type;																				// Type of the rule, e.g. string, array, ...
		rule_errors = rule.errors;																		// The errors the rule has

		is_set = field in manifest;																		// Add error if file required and is not defined
		if(required && !is_set)
			addErrorManifest(rule_errors.field, rules.errors[rule_errors.field], "");

		is_type = (is_set ? isType(type, manifest[field], field) : false);										// Add error if field type is not ok
		if(!is_type && is_set)
			addErrorManifest(rule_errors.type, rules.errors[rule_errors.type], "");

		// CHECK MANIFEST FIELDS USING DIFFERENT ALGORITHM FOR DIFFERENT FIELDS
		// OBJECT/OBJECTS - OBJECT/OBJECTS - OBJECT/OBJECTS - OBJECT/OBJECTS - OBJECT/OBJECTS - OBJECT/OBJECTS - OBJECT/OBJECTS - OBJECT/OBJECTS
		if((type == "objects" || type == "object") && is_set && is_type)
			{
			objects = (type == "object" ? new Array(manifest[field]) : manifest[field]);					// Make "object" an array of objects for iteration

			if(objects.length == 0)																			// Add error if object array is empty
				addErrorManifest(rule_errors.empty, rules.errors[rule_errors.empty], "");

			for(i = 0; i < objects.length; i++)																// Loop through the objects in the rule for a particular manifest field
				{
				object = objects[i];

				field_errors = false;
				for(sub_rule_field in rule.sub_rules)															// Check are the required fields present in the object and valid
					{
					sub_rule = rule.sub_rules[sub_rule_field];														// Every object or objects rule has its own sub_rules
					sub_rule_errors = sub_rule.errors;

					is_required = sub_rule.required;

					is_set = (typeof object == "object" && sub_rule_field in object);								// Add error if required fields are not defined
					if(is_required && !is_set) {
						addErrorManifest(sub_rule_errors.field, rules.errors[sub_rule_errors.field], ""); field_errors = true; }

					is_type = (is_set ? isType(sub_rule.type, object[sub_rule_field]) : false);						// Add error if field type is not correct
					if(is_set && !is_type) {
						addErrorManifest(sub_rule_errors.type, rules.errors[sub_rule_errors.type], ""); field_errors = true; }

					if(is_set && is_type && !isValue(object[sub_rule_field], sub_rule.validator)) {					// Add error if field value is not ok
						addErrorManifest(sub_rule_errors.error, rules.errors[sub_rule_errors.error], ""); field_errors = true; }
					}

				if(!field_errors)																					// If fields are ok, check for duplicate values or illegal combinations (e.g. unique_name == service.suggested_application)
					isUnique(rule, object, type);
				}
			}
		// ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY - ARRAY
		else if(type == "array" && is_set && is_type)
			{
			sub_rule_errors = rule.sub_rules.errors;														// Every array rule has its own sub_rules

			if(manifest[field].length == 0)																	// Add error if array is empty
				addErrorManifest(rule_errors.empty, rules.errors[rule_errors.empty], "");

			field_errors = false;
			for(j = 0; j < manifest[field].length; j++)
				{
				value = manifest[field][j];

				is_type = isType(rule.sub_rules.type, value);													// Add error if field type is not correct
				if(!is_type) {
					addErrorManifest(sub_rule_errors.type, rules.errors[sub_rule_errors.type], ""); field_errors = true; }

				if(is_type && !isValue(value, rule.sub_rules.validator)) {										// Add error if field value is not ok
					addErrorManifest(sub_rule_errors.error, rules.errors[sub_rule_errors.error], ""); field_errors = true; }

				if(!field_errors)																				// If fields are ok, check for duplicate values or illegal combinations (e.g. unique_name == service.suggested_application)
					isUnique(rule, value, type);
				}
			}
		// STRING/BOOLEAN - STRING/BOOLEAN - STRING/BOOLEAN - STRING/BOOLEAN - STRING/BOOLEAN - STRING/BOOLEAN - STRING/BOOLEAN - STRING/BOOLEAN
		else if((type == "string" || type == "boolean") && is_set && is_type)
			{
			if(!isValue(manifest[field], rule.validator))
				addErrorManifest(rule.errors.error, rules.errors[rule.errors.error], "");

			if(rule.unique)																						// If fields are ok, check for duplicate values or illegal combinations (e.g. unique_name == service.suggested_application)
				isUnique(rule, manifest[field], type);
			}
		}

	return manifest;
	});

var isType = function(type, value, field)
	{
	var is_type = false;

	if(type == "array" || type == "objects")
		is_type = (value instanceof Array);
	if(type == "object")
		is_type = (typeof value == "object");
	else if(type == "string")
		is_type = (typeof value == "string");
	else if(type == "boolean")
		is_type = (typeof value == "boolean");

	return is_type;
	}

var isValue = function(value, validator)
	{
	var regx;

	if(validator.type == "regx")																	// Must not have the format of the pattern
		{
		regx = rules.regxs[validator.match].replace(/^\/|\/$/g, "");
		return (value.match(new RegExp(regx)) ? false : true);
		}
	else if(validator.type == "nregx")																// Must have the format of the pattern
		{
		regx = rules.regxs[validator.match].replace(/^\/|\/$/g, "");
		return (!value.match(new RegExp(regx)) ? false : true);
		}
	else if(validator.type == "list")
		return rules.lists[validator.match].indexOf(value) != -1;
	else if(validator.type == "function")
		return self[validator.name](value, validator.params);
	}

var isUnique = function(rule, vobj, type)
	{
	var i, j, unique, compare, compare_type, value, uvalue, rxuv, rxv;

	if(!rule.unique)
		return;

	for(i = 0; i < rule.unique.length; i++)																// there might be multiple fields to check for uniqueness in a rule
		{
		unique = rule.unique[i];
		compare = unique.compare;																		// name of the compare array (e.g. service_name)
		compare_type = unique.compare_type;																// string match (equal) or regular expression match (regx)

		value = "";
		if(type == "objects" || type == "object")
			{
			for(j = 0; j < unique.fields.length; j++)													// value can be a single or compound value (service_name, directory+file)
				value += (vobj[unique.fields[j]] ? vobj[unique.fields[j]] + "+" : "");					// ignore optional fields
			}
		else if(type == "array" || "string")
			value = vobj + "+";

		if(unique_values[compare])																		// does the compare array exist (e.g. for service_name)
			{
			for(j = 0; j < unique_values[compare].length; j++)
				{
				uvalue = unique_values[compare][j];

				if(compare_type == "equal")																	// simple string comparison
					{
					if(value == uvalue)
						addErrorManifest(unique.error, rules.errors[unique.error], "");
					}
				else if(compare_type == "regx")																// match values (like hostname) using RegExp
					{
					rxuv = value.replace(/\./, "\.");															// escape values for RegExp
					rxuv = rxuv.replace(/\*/, ".*");
					rxv = uvalue.replace(/\./, "\.");
					rxv = rxv.replace(/\*/, ".*");

					if(uvalue.match(new RegExp(rxuv)) || value.match(new RegExp(rxv)) )							// neither can match the other
						addErrorManifest(unique.error, rules.errors[unique.error], "");
					}
				}
			}

		if(unique.store)																				// store value for next comparisons
			!(compare in unique_values) ? unique_values[compare] = [value] : unique_values[compare].push(value);
		}

	}

self.suggestedApplication = function(value, params)
	{
	var regx, values = value.split(/@/);

	if(values.length > 2)												// More than one @
		return false;

	regx = rules.regxs[params[0]];
	if(values[0].match(new RegExp(regx)))								// Match against regular expression "unique_name"
		return false;

	regx = rules.regxs[params[1]];
	if(values.length == 2 && values[1].match(new RegExp(regx)))			// Match against regular expression "version"
		return false;

	return true;
	}

self.serviceName = function(value, params)
	{ // JavaScript doesn't support negative look behinds and /^(spaceify.org\/services\/[0-9a-z_\/]{3,106})$(?<!\/http|https)/ won't work!
	if(value.match(/(\/http|https|\/)$/))									// Can't be with http or https, because they are reserved services, or end with /
		return false;

	if(!value.match(/^(spaceify.org\/services\/[0-9a-z_\/]{3,106})$/))	// Must match this predefined rule for service names
		return false;

	return true;
	}

self.makeUniqueDirectory = function(unique_name, noEndSlash)
	{ // Make a file system safe directory name: lowercase, allowed characters, can't start or end with /.
	unique_name = unique_name.toLowerCase();
	unique_name = unique_name.replace(/[^a-z0-9\/]/g, "/");
	unique_name = unique_name.replace(/^\/+/, "");
	unique_name += (unique_name.search(/\/$/) != -1 ? "" : "/");

	if(noEndSlash)
		unique_name = unique_name.replace(/\/$/, "");

	return unique_name;
	}

var addError = function(error)
	{
	errors.push(error);
	}

var addErrorManifest = function(code, message, path)
	{
	errors.push(errorc.makeErrorObject(code, message, path));
	}

}

module.exports = ValidateApplication;