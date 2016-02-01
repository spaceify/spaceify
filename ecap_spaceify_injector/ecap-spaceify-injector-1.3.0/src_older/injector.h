#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <map>
#include <vector>
#include <time.h>
#include "sqlite3/sqlite3.h"
#include "uriParser.h"
using namespace std;

class Injector
{
private:
	string path;
	time_t timev;
	string spaceifystr;

public:
	Injector(string path)
	{
		this->path = path;

		getSpaceifyInject(true);
	};

	~Injector()
	{

	}

	inline void compareHost(string host, vector<pair<string::iterator, map<string, string> > > *pInjectVect)
	{
		char sql[256];
		const char *pzTail;
		sqlite3 *pdb = NULL;
		int i, result, strln;
		sqlite3_stmt *pstmt = NULL;
		pair<string::iterator, map<string, string> > pari;

		try
		{
			if((result = sqlite3_open_v2(path.c_str(), &pdb, SQLITE_OPEN_READONLY, NULL)) != SQLITE_OK)
				throw(0);
			if(pdb == NULL)
				throw(1);

			http::url parsed = http::ParseHttpUrl(host);

			// Application can have only one inject but many urls which are matched -> return one of a kind 
			sprintf(sql, "SELECT applications_id, inject_url, inject_identifier, inject_text, inject_enabled FROM inject_urls LEFT JOIN applications ON applications.id = inject_urls.applications_id WHERE '%s' LIKE inject_url GROUP BY applications_id", parsed.host.c_str());
			strln = strlen(sql);
			pzTail = sql; pzTail += strln;
			if(sqlite3_prepare(pdb, sql, strln, &pstmt, &pzTail) != SQLITE_OK)
				throw(2);

			while(1)
			{
				i = sqlite3_step(pstmt);
				if(i == SQLITE_DONE || i == SQLITE_ERROR)
					break;

				if(!sqlite3_column_int(pstmt, 4))							// is injection_enabled for this application
					continue;

				pari.second["inject_url"] = (char*)sqlite3_column_text(pstmt, 1);
				pari.second["inject_identifier"] = (char*)sqlite3_column_text(pstmt, 2);
				pari.second["inject_text"] = (char*)sqlite3_column_text(pstmt, 3);
				pari.first = pari.second["inject_identifier"].begin();		// setup iterator start to the beginning of the text (identifier) we are searching!
				pInjectVect->push_back(pari);
			}
		}
		catch(int err)
		{}

		if(pstmt != NULL)													// Finalize or database stays write locked for everybody else!
			sqlite3_finalize(pstmt);
		if(pdb != NULL)
			sqlite3_close(pdb);
	}

	inline string getSpaceifyInject(bool force)								// Get spaceifyclient.js injection as text from the database
	{
		time_t ntimev;
		int i, result;
		sqlite3 *pdb = NULL;
		sqlite3_stmt *pstmt = NULL;
		static const char *sql = "SELECT inject_spaceifyclient FROM settings";
		static const int strln = strlen(sql);
		static const char *pzTail = sql + strln;

		time(&ntimev);														// No need to restart squid3 when settings are changed, if we reload the spaceify inject once every minute
		if(force || difftime(ntimev, timev) >= 60)
		{
			timev = ntimev;

			try
			{
				if((result = sqlite3_open_v2(path.c_str(), &pdb, SQLITE_OPEN_READONLY, NULL)) != SQLITE_OK)
					throw(0);
				if(pdb == NULL)
					throw(1);

				if(sqlite3_prepare(pdb, sql, strln, &pstmt, &pzTail) != SQLITE_OK)
					throw(2);

				i = sqlite3_step(pstmt);
				if(i == SQLITE_DONE || i == SQLITE_ERROR)
					throw(3);

				spaceifystr = (char*)sqlite3_column_text(pstmt, 0);
			}
			catch(int err)
			{}

			if(pstmt != NULL)												// Finalize or database stays write locked for everybody else!
				sqlite3_finalize(pstmt);
			if(pdb != NULL)
				sqlite3_close(pdb);
		}

		return spaceifystr;
	}

	void addToLog(const char *str)
	{
		FILE *pFile;
		pFile = fopen("/tmp/out.log", "a");
		if(pFile != NULL)
		{
			fputs(str, pFile);
			fputs("\n", pFile);
			fclose(pFile);
		}
	}
};
