/**
 * Install helper, 3.6.2016 Spaceify Oy
 * 
 */

if(process.argv.length < 4)
	process.exit(0);

if(process.argv[2] == "dbSettingsValuesForV6")
	{
	var values = process.argv[3].split("|");

	console.log("('" + values[0] + "','" + values[1] + "','3600000')");				// Get locale, splash_ttl and log_in_session_ttl
	}
else if(process.argv[2] == "dbSettingsFieldsForV6")
	{ // Get locale, splash_ttl and log_in_session_ttl
	var fields = process.argv[3];

	fields = fields.replace(/\s/g, "");												// whitespace
	fields = fields.replace(/'.*?'/g, "");											// occurances of text between '' ('.*?' non-greedy)
	fields = fields.replace(/[0-9A-Z]/g, "");										// digits and capital letters

	fields = fields.split(",");

	console.log("(" + fields[0] + "," + fields[1] + "," + fields[2] + ")");			// Get locale, splash_ttl and log_in_session_ttl
	}
