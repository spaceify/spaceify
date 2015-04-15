var mmm = require("mmmagic");
var fibrous = require("fibrous");
var Config = require("./config")();
var Utility = require("./utility");
var Language  = require("./language");

function ValidateApplication()
{
var self = this;
var errors = [];
var rules = null;
var unique_values = [];

self.validatePackage = fibrous( function(package_path, save_path_manifest)
	{
	try {
		errors = [];
		rules = null;
		unique_values = [];

		var application_path = package_path + Config.APPLICATION_DIRECTORY;
		var manifest_path = application_path + Config.MANIFEST

		// REQUIRED DIRECTORIES AND FILES
		if(!Utility.sync.isLocal(package_path, "directory"))
			throw Utility.error(Language.E_NO_APPLICATION_DIRECTORY.p("ValidateApplication::validate"));

		if(!Utility.sync.isLocal(manifest_path, "file"))
			throw Utility.error(Language.E_NO_MANIFEST_FILE.p("ValidateApplication::validate"));

		// VALIDATE MANIFEST
		var manifest = self.validateManifestFile.sync(manifest_path);

		// VALIDATE DIRECTORIES AND FILES IN THE PACKAGE
		if(errors.length == 0)
			self.validateDirectories.sync(application_path, manifest);

		// SAVE MANIFEST IF SAVE PATH IS SET
		if(save_path_manifest && errors.length == 0)
			Utility.sync.saveJSON(save_path_manifest + Config.MANIFEST, manifest, true);
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
	var i, obj, type, path = "";

	try {
		if(manifest.type == Config.SPACELET)												// inject_files
			{
			for(i=0; i<manifest.inject_files.length; i++)
				{
				obj = manifest.inject_files[i];

				path = Utility.preparePath(obj.directory ? obj.directory : "");
				if(!Utility.sync.isLocal(application_path + Config.WWW_DIRECTORY + path + obj.file, "file"))
					addError( Utility.ferror(Language.E_INJECT_FILE.p("ValidateApplication::validateDirectories"), {":file": path + obj.file, ":directory": Config.APPLICATION_DIRECTORY + Config.WWW_DIRECTORY + path + obj.file}) );
				}
			}

		if(manifest.images)																	// images
			{
			var magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);

			for(i=0; i<manifest.images.length; i++)
				{
				obj = manifest.images[i];

				path = Utility.preparePath(obj.directory ? obj.directory : "");
				image = application_path + Config.IMAGE_DIRECTORY + path + obj.file;

				if(!Utility.sync.isLocal(image, "file"))
					addError( Utility.ferror(Language.E_IMAGE_FILE.p("ValidateApplication::validateDirectories"), {":file": obj.file, ":directory": obj.directory}) );
				else
					{
					mtype = magic.sync.detectFile(image);

					type = obj.file.split(".");
					if(Config.IMAGE_TYPES.indexOf(mtype) == -1)
						addError( Utility.error(Language.E_IMAGE_TYPES.p("ValidateApplication::validateDirectories")) );
					}
				}
			}

		if(manifest.docker_image)														// Dockerfile
			{
			if(!Utility.sync.isLocal(application_path + Config.DOCKERFILE, "file"))
				addError( Utility.error(Language.E_DOCKER_IMAGE.p("ValidateApplication::validateDirectories")) );
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
		manifest = Utility.sync.loadJSON(manifest_path, true, true);

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
	var i, j, rule, rule_errors, sub_rule, sub_rule_errors, required, type, value, is_required, is_set, is_type, objects, object, sub_rule_field, field_errors;

	rules = Utility.sync.loadJSON(Config.SPACEIFY_MANIFEST_FILE, true, true);							// Get the manifest parsing validation rules

	if(!manifest.type || rules.lists.application_types.indexOf(manifest.type) == -1)					// Manifest must have the type field
		throw Utility.error(Language.E_MANIFEST_TYPE.p("ValidateApplication::validateManifest"));

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
		if((type == "objects" || type == "object") && is_set && is_type)
			{
			objects = (type == "object" ? new Array(manifest[field]) : manifest[field]);					// Make "object" an array of objects for iteration

			if(objects.length == 0)																			// Add error if object array is empty
				addErrorManifest(rule_errors.empty, rules.errors[rule_errors.empty], "");

			for(i=0; i<objects.length; i++)																	// Loop through the objects in the rule for a particular manifest field
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
		else if(type == "array" && is_set && is_type)
			{
			sub_rule_errors = rule.sub_rules.errors;														// Every array rule has its own sub_rules

			if(manifest[field].length == 0)																	// Add error if array is empty
				addErrorManifest(rule_errors.empty, rules.errors[rule_errors.empty], "");

			field_errors = false;
			for(j=0; j<manifest[field].length; j++)
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
		else if((type == "string" || type == "boolean") && is_set && is_type)
			{
			if(!isValue(manifest[field], rule.validator))
				addErrorManifest(rule.errors.error, rules.errors[rule.errors.error], "");

			if(rule.unique)																						// If fields are ok, check for duplicate values or illegal combinations (e.g. unique_name == service.suggested_application)
				isUnique(rule, manifest[field], type);
			}
		}

	if(manifest.unique_name)
		manifest.unique_directory = self.makeUniqueDirectory(manifest.unique_name);						// Create internal manifest fields

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

	for(i=0; i<rule.unique.length; i++)																// there might be multiple fields to check for uniqueness in a rule
		{
		unique = rule.unique[i];
		compare = unique.compare;																		// name of the compare array (e.g. service_name)
		compare_type = unique.compare_type;																// string match (equal) or regular expression match (regx)

		value = "";
		if(type == "objects" || type == "object")
			{
			for(j=0; j<unique.fields.length; j++)														// value can be a single or compound value (service_name, directory+file)
				value += (vobj[unique.fields[j]] ? vobj[unique.fields[j]] + "+" : "");					// ignore optional fields
			}
		else if(type == "array" || "string")
			value = vobj + "+";

		if(unique_values[compare])																		// does the compare array exist (e.g. for service_name)
			{
			for(j=0; j<unique_values[compare].length; j++)
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
	{ // JavaScript doesn't support negative lookbehinds and /^(spaceify.org\/services\/[0-9a-z_\/]{3,106})$(?<!\/http|https)/ won't work!
	if(value.match(/(\/http|https|\/)$/))									// Can't be with http or https, because they are reserved services, or end with /
		return false;

	if(!value.match(/^(spaceify.org\/services\/[0-9a-z_\/]{3,106})$/))	// Must match this predefined rule for service names
		return false;

	return true;
	}

self.makeUniqueDirectory = function(unique_name)
	{ // Make a file system safe directory name: lowercase, allowed characters, can't start or end with /.
	unique_name = unique_name.toLowerCase();
	unique_name = unique_name.replace(/[^a-z0-9\/]/g, "/");
	unique_name = unique_name.replace(/^\/+/, "");
	unique_name += (unique_name.search(/\/$/) != -1 ? "" : "/");

	return unique_name;
	}

var addError = function(error)
	{
	var messages = "", codes = "", paths = "";
	for(var i=0; i<error.codes.length; i++)
		{
		codes += (i == 0 ? "" : ", ") + (error.codes[i] ? error.codes[i] : "-");
		messages += (i == 0 ? "" : ", ") + error.messages[i];
		paths += (i == 0 ? "" : ", ") + (error.paths[i] ? error.paths[i] : "-");
		}

	errors.push(Utility.makeError(codes, messages, paths));
	}

var addErrorManifest = function(code, message, path)
	{
	errors.push(Utility.makeError(code, message, path));
	}
}

module.exports = ValidateApplication;