/**
 * Crypt, 29.5.2015, Spaceify Inc.
 * 
 * Crypt uses cores private key and certificate to create encryption key and initialization vector.
 *
 * @class Crypt
 */

var fs = require("fs");
var crypto = require("crypto");
var fibrous = require("fibrous");
var config = require("./config")();
var utility = require("./utility");

function Crypt()
{
var self = this;

var algorithm = "aes-256-cbc";
var output_format = "hex";
var salt_length = 32;

self.encrypt_utf8 = fibrous( function(string)
	{
	var key_iv = createKeyIv.sync();

	var cipher = crypto.createCipheriv(algorithm, key_iv.key, key_iv.iv);

	var encrypted = cipher.update(key_iv.salt + string, "utf8", output_format);

	encrypted += cipher.final(output_format);

	return encrypted;
	})

self.decrypt_utf8 = fibrous( function(encrypted, to_json)
	{
	var decrypted = null;

	try {
		var key_iv = createKeyIv.sync();

		var decipher = crypto.createDecipheriv(algorithm, key_iv.key, key_iv.iv);

		decrypted = decipher.update(encrypted, output_format, "utf8");

		decrypted += decipher.final("utf8");

		decrypted = decrypted.substr(salt_length, decrypted.length - salt_length);

		if(to_json)
			decrypted = utility.parseJSON(decrypted, true);
		}
	catch(err)
		{
		decrypted = null;
		}

	return decrypted;
	})

var createKeyIv = fibrous( function()
	{
	var key_file, iv_file;

	if(utility.isLocal.sync(config.SPACEIFY_TLS_PATH + config.SERVER_KEY, "file"))
		{
		key_file = fs.sync.readFile(config.SPACEIFY_TLS_PATH + config.SERVER_KEY);
		iv_file = fs.sync.readFile(config.SPACEIFY_TLS_PATH + config.SERVER_CRT);
		}
	else
		{
		key_file = fs.sync.readFile(config.APPLICATION_TLS_PATH + config.SERVER_KEY);
		iv_file = fs.sync.readFile(config.APPLICATION_TLS_PATH + config.SERVER_CRT);
		}

	var key_hash = crypto.createHash("sha256");
	key_hash.update(key_file);

	var iv_hash = crypto.createHash("md5");
	iv_hash.update(iv_file);

	var key = key_hash.digest("binary");
	var iv = iv_hash.digest("binary");
	var salt = utility.randomString(salt_length, false);

	return {key: key, iv: iv, salt: salt};
	})
}

module.exports = new Crypt();