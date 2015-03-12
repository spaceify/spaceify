#include <iostream>
#include <string>
#include <stdlib.h>

// Adapated from: CovenantEyes / uri-parser (GitHub)

namespace http
{
    struct url
	{
        std::string protocol, user, password, host, path, search, hash, filename, filesuffix;
        int port;
    };

    //--- Helper Functions -------------------------------------------------------------~
    static inline std::string TailSlice(std::string &subject, std::string delimiter, bool keep_delim, bool reverse)
	{ // Chops off the delimiter and everything that follows (destructively) returns everything after the delimiter
		std::string output = "";
		size_t dlm_pos, dlm_len, pos, len;

		try
		{
			dlm_pos = !reverse ? subject.find(delimiter) : subject.rfind(delimiter);
			dlm_len = delimiter.length();

			if(dlm_pos < std::string::npos)
			{
				pos = keep_delim ? dlm_pos : dlm_pos + dlm_len;
				len = subject.length() - pos;
				output = (len <= 0 ? "" : subject.substr(pos, len));

				subject = subject.substr(0, dlm_pos);
			}
		}
		catch(std::exception e)
		{}

        return output;
    }

    static inline std::string HeadSlice(std::string &subject, std::string delimiter)
	{ // Chops off the delimiter and everything that precedes (destructively) returns everthing before the delimeter
		std::string output = "";
		size_t dlm_pos, pos, len;

		try
		{
			dlm_pos = subject.find(delimiter);
			if(dlm_pos < std::string::npos)
			{
				output = subject.substr(0, dlm_pos);

				pos = dlm_pos + delimiter.length();
				len = subject.length() - pos;
				subject = (len <= 0 ? "" : subject.substr(pos, len));
			}
		}
		catch(std::exception e)
		{}

        return output;
    }

    //--- Extractors -------------------------------------------------------------------~
    static inline int ExtractPort(std::string &hostport)
	{
        int port;
        std::string portstring = TailSlice(hostport, ":", false, false);
        try { port = atoi(portstring.c_str()); }
        catch (std::exception e) { port = -1; }
        return port;
    }

	static inline std::string ExtractProtocol(std::string &in) { return HeadSlice(in, "://"); }
    static inline std::string ExtractSearch(std::string &in) { return TailSlice(in, "?", false, false); }
	static inline std::string ExtractHash(std::string &in) { return TailSlice(in, "#", false, false); }
    static inline std::string ExtractPath(std::string &in) { return TailSlice(in, "/", true, false); }
    static inline std::string ExtractPassword(std::string &userpass) { return TailSlice(userpass, ":", false, false); }
    static inline std::string ExtractUserpass(std::string &in) { return HeadSlice(in, "@"); }
	static inline std::string ExtractFilename(std::string &in) { return TailSlice(in, "/", false, true); }
	static inline std::string ExtractFilesuffix(std::string &in) { return TailSlice(in, ".", false, true); }

    //--- Public Interface -------------------------------------------------------------~
    static inline url ParseHttpUrl(std::string &in)
	{
        url ret;
        ret.port = -1;

        ret.protocol = ExtractProtocol(in);

		std::string search = ExtractSearch(in);
        ret.hash = ExtractHash(search);
		ret.search = search;

        ret.path = ExtractPath(in);

        std::string userpass = ExtractUserpass(in);
        ret.password = ExtractPassword(userpass);
        ret.user = userpass;

        ret.port = ExtractPort(in);

        ret.host = in;

		std::string file = ret.path;
		ret.filename = ExtractFilename(file);

		std::string filename = ret.filename;
		ret.filesuffix = ExtractFilesuffix(filename);

        return ret;
    }
}
