/**
 * Install helper, 3.6.2016 Spaceify Oy
 * 
 */

if(process.argv.length < 4)
	process.exit(0);

if(process.argv[2] == "dbSettingsValuesForV6")
	{
	var values = process.argv[3].split("|");

	if(values.length < 2)
		values = ['', ''];

	values = 	[
				"'" + values[0] + "'",														// 0 locale TEXT DEFAULT 'en_US'
				"'" + values[1] + "'",														// 1 splash_ttl INTEGER DEFAULT 3600000
				"'3600000'"																	// 2 log_in_session_ttl INTEGER DEFAULT 3600000
				].join(",");

	console.log("(" + values + ")");
	}

else if(process.argv[2] == "dbUserValuesForV6")
	{
	var values = process.argv[3].split("|");

	if(values.length < 6)
		values = ['', '', '', '', '', ''];

	values =	[
				"'" + values[0] + "'",														// 0 edge_id TEXT NOT NULL PRIMARY KEY
				"''",																		// 1 edge_name TEXT
				"'" + values[1] + "'",														// 2 edge_password TEXT
				"''",																		// 3 edge_salt TEXT
				"'0'",																		// 4 edge_enable_remote INTEGER DEFAULT 0
				"'1'",																		// 5 edge_require_password INTEGER DEFAULT 0
				"'" + values[2] + "'",														// 6 admin_password TEXT
				"'" + values[3] + "'",														// 7 admin_salt TEXT
				"'" + values[4] + "'",														// 8 admin_login_count INTEGER DEFAULT 0
				"'" + values[5] + "'"														// 9 admin_last_login INTEGER DEFAULT 0);
				].join(",");

	console.log("(" + values + ")");
	}

else if(process.argv[2] == "dbGetColumns")
	{
	var columns = process.argv[3];

	columns = columns.replace(/\s/g, "");													// whitespace
	columns = columns.replace(/'.*?'/g, "");												// occurances of text between '' ('.*?' non-greedy)
	columns = columns.replace(/[0-9A-Z]/g, "");												// digits and capital letters

	console.log("(" + columns + ")");
	}