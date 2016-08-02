storage =
{
	locale: "en_US",														// Default values
	section: "global",
	locales: {},
	languages: {},

	initFile: "",

	tile: "",
	appTile: "",
	adminTile: "",
	certificateTile: "",

	head: "",
	body: "",

	// Language methods
	get: function(index)
		{
		if(!this.languages[this.locale])
			this.make();

		return (this.languages[this.locale].language[index] ? this.languages[this.locale].language[index] : "");
		},

	make: function()
		{
		var final = {};

		var global = this.locales[this.locale].global;

		var language = this.locales[this.locale][this.section];

		for(i in global)
			final[i] = global[i];

		for(i in language)													// NOTICE: section strings overwrite global strings
			final[i] = language[i];

		this.languages[this.locale] =
			{
			section: this.section,
			locale: final.locale,
			encoding: final.encoding,
			description: final.description,
			language: final
			};
		},
};