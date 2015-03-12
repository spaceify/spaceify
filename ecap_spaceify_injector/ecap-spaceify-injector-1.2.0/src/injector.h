#include <algorithm>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <map>
#include <vector>
#include <fstream>
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
			if((result = sqlite3_open_v2(path.c_str(), &pdb, SQLITE_OPEN_READONLY, NULL)) != SQLITE_OK)
				throw(1);
			if(pdb == NULL)
				throw(2);

			parsed = http::ParseHttpUrl(host);

			if(parsed.host == "edge.spaceify.net")							// don't inject to edge!
				return;

			spaceifyFiles += getFiles("", protocol, pdb, true);				// spaceify's files are injected automatically before any application files

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
		sqlite3_stmt *pstmt = NULL;
		string injects, str, url_or_path, directory, file, inject_type, app_url;

		try
		{
			if(isSpaceify)														// get spaceifys files
				strncpy(sql, "SELECT url_or_path, directory, file, inject_type, inject_order FROM inject_files WHERE is_spaceify=1 ORDER BY inject_order ASC", 2048);
			else																// get application files
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
				app_url = protocol + "://" + url_or_path + directory + file + "?app=" + unique_name + "&type=spacelet";

				str = "";
				if(inject_type == "javascript")
					str = "<script type=\"text/javascript\" src=\"" + app_url + "\"></script>\n";
				else if(inject_type == "css")
					str = "<link rel=\"stylesheet\" type=\"text/css\" media=\"all\" href=\"" + app_url + "\">\n";
				else if(inject_type == "file")
					str = loadFile(url_or_path + directory + file);

				injects += str;
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

		return injects;
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

};
