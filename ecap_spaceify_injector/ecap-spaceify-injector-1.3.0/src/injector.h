#include <algorithm>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <map>
#include <vector>
#include <fstream>
#include <sstream>
#include <time.h>
#include "sqlite3/sqlite3.h"
#include "uriParser.h"
using namespace std;

class Injector
{
private:
	string path;

public:
	Injector(string path)
	{
		this->path = path;
	};

	~Injector()
	{

	}

	inline void compareHost(string host, string protocol, vector<pair<string::iterator, map<string, string> > > *pInjectVect)
	{
		char sql[2048];
		http::url parsed;
		const char *pzTail;
		sqlite3 *pdb = NULL;
		int i, result, strln;
		sqlite3_stmt *pstmt = NULL;
		string spaceifyFiles = "\n";
		pair<string::iterator, map<string, string> > pari;

		transform(protocol.begin(), protocol.end(), protocol.begin(), ::tolower);

		try
		{
			if((result = sqlite3_open_v2(this->path.c_str(), &pdb, SQLITE_OPEN_READONLY, NULL)) != SQLITE_OK)
				throw(1);
			if(pdb == NULL)
				throw(2);

			parsed = http::ParseHttpUrl(host);

			if(parsed.host == "edge.spaceify.net" || parsed.host == "10.0.0.1")	// don't inject to edge!
				return;

			spaceifyFiles += getFiles("", protocol, pdb, true);					// spaceify's files are injected automatically before any application files

			// Application can have only one inject but many hosts which are matched -> return one result for each application
			sprintf(sql, "SELECT inject_hostnames.unique_name, inject_hostname, inject_identifier, inject_enabled FROM inject_hostnames LEFT JOIN applications ON applications.unique_name = inject_hostnames.unique_name WHERE '%s' LIKE inject_hostname GROUP BY inject_hostnames.unique_name", parsed.host.c_str());
			strln = strlen(sql);
			pzTail = sql; pzTail += strln;
			if(sqlite3_prepare(pdb, sql, strln, &pstmt, &pzTail) != SQLITE_OK)
				throw(3);

			while(1)
			{
				i = sqlite3_step(pstmt);
				if(i == SQLITE_DONE || i == SQLITE_ERROR)
					break;

				if(!sqlite3_column_int(pstmt, 3))							// is injection_enabled for this application
					continue;

				pari.second["inject_hostname"] = (char*)sqlite3_column_text(pstmt, 1);
				pari.second["inject_identifier"] = (char*)sqlite3_column_text(pstmt, 2);
				pari.second["inject_text"] = spaceifyFiles + getFiles((char*)sqlite3_column_text(pstmt, 0), protocol, pdb, false);
				pari.first = pari.second["inject_identifier"].begin();		// setup iterator start to the beginning of the text (identifier) we are searching!
				pInjectVect->push_back(pari);

				spaceifyFiles = "";											// inject spaceify files only once!!!
			}
		}
		catch(int err)
		{}

		if(pstmt != NULL)													// Finalize or database stays write locked for everybody else!
			sqlite3_finalize(pstmt);
		if(pdb != NULL)
			sqlite3_close(pdb);
	}

	inline string getFiles(string unique_name, string protocol, sqlite3 *pdb, bool isSpaceify)
	{
		int i, strln;
		char sql[2048];
		const char *pzTail;
		vector<string> tokens;
		string SPACES = " \t\r\n";
		sqlite3_stmt *pstmt = NULL;
		string inject_str, str, full_url, url_or_path, directory, file, line, jsonf, inject_type, url, path, mime, parameter;

		if(isSpaceify)														// GET SPACEIFYS FILES
		{
			/*ifstream bstream("/var/lib/spaceify/code/www/lib/inject/spaceify.csv");
			if(bstream.bad())
				throw(5);

			while(true)
			{
				if(!getline(bstream, line, '\n'))
					break;

				if(line.length() == 0)
					continue;

				line = trim(line, SPACES);

				if(line.length() == 0 || line[0] == '#')
					continue;

				tokens = split(line, '\t');

				if(tokens.size() != 5)
					continue;

				inject_type = trim(tokens[0], SPACES);
				url = trim(tokens[1], SPACES);
				path = trim(tokens[2], SPACES);
				mime = trim(tokens[3], SPACES);
				parameter = trim(tokens[4], SPACES);

				str = "";
				if(inject_type == "javascript")
				{
					full_url = protocol + string("://10.0.0.1/") + url;					// "://edge.spaceify.net/"
					str = "<script type=\"text/javascript\" src=\"" + full_url + "\"></script>\n";
				}
				else if(inject_type == "css")
				{
					full_url = protocol + string("://10.0.0.1/") + url;					// "://edge.spaceify.net/"
					str = "<link rel=\"stylesheet\" type=\"text/css\" media=\"" + parameter + "\">\n";
				}
				else if(inject_type == "text")
					str = loadFile(path);
				else if(inject_type == "json")
				{
					jsonf = loadFile(path);
					replace(jsonf, "\\\\", "\\");
					replace(jsonf, "\"", "\\\"");
					replace(jsonf, "\n", "");

					str = string("window.") + parameter + string(" = JSON.parse(\"") + jsonf + string("\");\n");
					str = string("<script type=\'text/javascript\'>\n\t") + str + "\n</script>\n";
				}

				inject_str += str;
			}

			bstream.close();*/

			full_url = protocol + string("://10.0.0.1/lib/spaceifyinitialize.js");			// "://edge.spaceify.net/"
			inject_str = "<script type=\"text/javascript\" src=\"" + full_url + "\"></script>\n";
		}
		else																// GET APPLICATION FILES
		{
			try
			{
				sprintf(sql, "SELECT url_or_path, directory, file, inject_type, inject_order FROM inject_files WHERE unique_name='%s' ORDER BY inject_order ASC", unique_name.c_str());

				strln = strlen(sql);
				pzTail = sql; pzTail += strln;
				if(sqlite3_prepare(pdb, sql, strln, &pstmt, &pzTail) != SQLITE_OK)
					throw(4);

				while(1)
				{
					i = sqlite3_step(pstmt);
					if(i == SQLITE_DONE || i == SQLITE_ERROR)
						break;

					url_or_path = (char*)sqlite3_column_text(pstmt, 0);
					directory = (char*)sqlite3_column_text(pstmt, 1);
					file = (char*)sqlite3_column_text(pstmt, 2);
					inject_type  = (char*)sqlite3_column_text(pstmt, 3);
					full_url = protocol + "://" + url_or_path + directory + file + "?app=" + unique_name + "&type=spacelet";

					str = "";
					if(inject_type == "javascript")
						str = "<script type=\"text/javascript\" src=\"" + full_url + "\"></script>\n";
					else if(inject_type == "css")
						str = "<link rel=\"stylesheet\" type=\"text/css\" media=\"all\" href=\"" + full_url + "\">\n";
					else if(inject_type == "file")
						str = loadFile(url_or_path + directory + file);

					inject_str += str;
				}
			}
			catch(int err)
			{
				if(pstmt != NULL)													// Finalize or database stays write locked for everybody else!
					sqlite3_finalize(pstmt);
				throw(err);
			}

			if(pstmt != NULL)													// Finalize or database stays write locked for everybody else!
				sqlite3_finalize(pstmt);
		}

		return inject_str;
	}

	string loadFile(const string &filename)
	{
		string line, lines;
		ifstream afile(filename.c_str());
		if(afile.is_open())
		{
			while(getline(afile, line))
				lines += line + "\n";
			afile.close();
		}

		return lines;
	}

	void addToLog(const char *str, int value)
	{
		FILE *pFile;
		char buf[32];

		pFile = fopen("/tmp/ecap.log", "a+");
		if(pFile != NULL)
		{
			sprintf(buf, ", value=%d", value);
			fputs(str, pFile);
			fputs(buf, pFile);
			fputs("\n", pFile);
			fclose(pFile);
		}
	}

	inline string trim(const string & s, const string & t)
	{
		string d(s);

		return d.erase(0, s.find_first_not_of(t));
	}

	vector<string> split(string s, char c)
	{
		vector<string> ret;

		istringstream bstream(s.c_str());
		string line;

		while(getline(bstream, line, c))
			ret.push_back(line);

		return ret;
	}

	void replace(std::string& str, const std::string& from, const std::string& to)
	{
		size_t start_pos = 0;

		while((start_pos = str.find(from, start_pos)) != std::string::npos)
		{
			str.replace(start_pos, from.length(), to);
			start_pos += to.length();
		}
	}

};
