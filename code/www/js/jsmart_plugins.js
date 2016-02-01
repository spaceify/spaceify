jSmart.prototype.registerPlugin('modifier', 'json', function(s)
	{
	var str = JSON.stringify(s);

	/*var jstr = str.split(/("[\w]+?":)/g);
	str = "";
	for(var i=0; i<jstr.length; i++)
		{
		if(jstr[i].match(/("[\w]+?":)/))												// Replace double quotations from ids
			jstr[i] = jstr[i].replace(/"/g, "");
		else																			// Escape double quotations
			jstr[i] = jstr[i].replace(/\\([\s\S])|(")/g, "\\\"");

		str += jstr[i];
		}*/

	return str;
	});
	
	
jSmart.prototype.registerPlugin('modifier', 'truncate', function(s, token)
	{
	var as = s.split(token);
	return as[0];
	});
	