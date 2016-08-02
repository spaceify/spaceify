#include "sample.h"
#include "injector.h"
#include <iostream>
#include <libecap/common/registry.h>
#include <libecap/common/errors.h>
#include <libecap/common/message.h>
#include <libecap/common/header.h>
#include <libecap/common/names.h>
#include <libecap/common/named_values.h>
//#include <libecap/common/config.h>
#include <libecap/host/host.h>
#include <libecap/adapter/service.h>
#include <libecap/adapter/xaction.h>
#include <libecap/host/xaction.h>
#include <iostream>
#include <fstream>
#include <sqlite3.h>
#include <map>
using namespace std;

namespace Adapter														// not required, but adds clarity
{

using libecap::size_type;

class Service: public libecap::adapter::Service
{
	public:
	Service();
	~Service();

	public:
		// About
		virtual std::string uri() const;								// unique across all vendors
		virtual std::string tag() const;								// changes with version and config
		virtual void describe(std::ostream &os) const;					// free-format info

		// Configuration
		virtual void configure(const libecap::Options &cfg);
		virtual void reconfigure(const libecap::Options &cfg);

		// Lifecycle
		virtual void start();											// expect makeXaction() calls
		virtual void stop();											// no more makeXaction() calls until start()
		virtual void retire();											// no more makeXaction() calls

		// Scope (XXX: this may be changed to look at the whole header)
		virtual bool wantsUrl(const char *url) const;

		// Work
		virtual libecap::adapter::Xaction *makeXaction(libecap::host::Xaction *hostx);

	public:
		// Debugging
		friend void addToLog(const char *str, int value);
};

class Cfgtor: public libecap::NamedValueVisitor
{
	public:
		Cfgtor(Service &aSvc): svc(aSvc) {}
		virtual void visit(const libecap::Name &name, const libecap::Area &value) {}
		Service &svc;
};

class Xaction: public libecap::adapter::Xaction
{
	public:
		Xaction(libecap::shared_ptr<Service> s, libecap::host::Xaction *x);
		virtual ~Xaction();

		// meta-information for the host transaction
		virtual const libecap::Area option(const libecap::Name &name) const;
		virtual void visitEachOption(libecap::NamedValueVisitor &visitor) const;

		// lifecycle
		virtual void start();
		virtual void stop();

		// adapted body transmission control
		virtual void abDiscard();
		virtual void abMake();
		virtual void abMakeMore();
		virtual void abStopMaking();

		// adapted body content extraction and consumption
		virtual libecap::Area abContent(size_type offset, size_type size);
		virtual void abContentShift(size_type size);

		// virgin body state notification
		virtual void noteVbContentDone(bool atEnd);
		virtual void noteVbContentAvailable();

		// libecap::Callable API, via libecap::host::Xaction
		virtual bool callable() const;

	protected:
		void adaptContent(std::string &chunk);							// converts vb to ab
		void stopVb();													// stops receiving vb (if we are receiving it)
		libecap::host::Xaction *lastHostCall();							// clears hostx

	private:
		libecap::shared_ptr<const Service> service;						// configuration access
		libecap::host::Xaction *hostx;									// Host transaction rep
		unsigned int foundCount;
		vector<pair<string::iterator, map<string, string> > > *pInjectVect;

		std::string buffer;												// for content adaptation

		typedef enum { opUndecided, opOn, opComplete, opNever } OperationState;
		OperationState receivingVb;
		OperationState sendingAb;

	public:
		// Debugging
		friend void addToLog(const char *str, int value);
};

static const std::string CfgErrorPrefix = "Modifying Adapter: configuration error: ";

static Injector *pInjector = new Injector(string("/var/lib/spaceify/db/spaceify.db"));

// Write log file for debugging
void addToLog(const char *str, int value)
{
	FILE *pFile;
	char buf[32];
	pFile = fopen("/tmp/out.log", "a");
	if(pFile != NULL)
	{
		sprintf(buf, ", value=%d", value);
		fputs(str, pFile);
		fputs(buf, pFile);
		fputs("\n", pFile);
		fclose(pFile);
	}
}

}	// namespace Adapter

// // // // // // // // // // // // // // // // // // // // // // // //
// Service STARTS // // // // // // // // // // // // // // // // // //

Adapter::Service::Service()
{	
}

Adapter::Service::~Service()
{
}

std::string Adapter::Service::uri() const
{
	return "ecap://www.spaceify.net/spaceify_injector";
}

std::string Adapter::Service::tag() const
{
	return PACKAGE_VERSION;
}

void Adapter::Service::describe(std::ostream &os) const
{
	os << "A html content modifying adapter " << PACKAGE_NAME << " v" << PACKAGE_VERSION;
}

void Adapter::Service::configure(const libecap::Options &cfg)
{
	Cfgtor cfgtor(*this);
	cfg.visitEachOption(cfgtor);
}

void Adapter::Service::reconfigure(const libecap::Options &cfg)
{
	// ToDo - clear injects - doesn't seem to come here ever?
	configure(cfg);
}

void Adapter::Service::start()
{
	libecap::adapter::Service::start();
	// custom code would go here, but this service does not have one
}

void Adapter::Service::stop()
{
	// custom code would go here, but this service does not have one
	libecap::adapter::Service::stop();
}

void Adapter::Service::retire()
{
	// custom code would go here, but this service does not have one
	libecap::adapter::Service::stop();
}

bool Adapter::Service::wantsUrl(const char *url) const
{
	string str = url;
	bool wants = true;

	// skip .png, .gif, .jpg, .css, .js, .svg, ... accept only html
addToLog(url, 0);
	http::url parsed = http::ParseHttpUrl(str);
	if(parsed.filesuffix != "" && parsed.filesuffix != "htm" && parsed.filesuffix != "html")
		wants = false;

	return wants;
}

libecap::adapter::Xaction *Adapter::Service::makeXaction(libecap::host::Xaction *hostx)
{	// 1/2 Create a new adapter, Xaction is passed from host to here
//addToLog("creating", (int)hostx);
	return new Adapter::Xaction(std::tr1::static_pointer_cast<Service>(self), hostx);
}

// // // // // // // // // // // // // // // // // // // // // // // //
// Xaction STARTS // // // // // // // // // // // // // // // // // //

Adapter::Xaction::Xaction(libecap::shared_ptr<Service> aService, libecap::host::Xaction *x):
service(aService), hostx(x), receivingVb(opUndecided), sendingAb(opUndecided)
{	// 2/2 Initialize state
	foundCount = 0;
	pInjectVect = new vector<pair<string::iterator, map<string, string> > >;
//addToLog("created", (int)hostx);
}

Adapter::Xaction::~Xaction()
{
//addToLog("Adapter::Xaction::~Xaction()", (int)hostx);
	if(libecap::host::Xaction *x = hostx)
	{
		hostx = NULL;

		delete pInjectVect;
		pInjectVect = NULL;

		x->adaptationAborted();
	}
}

const libecap::Area Adapter::Xaction::option(const libecap::Name &) const
{
	return libecap::Area();												// this transaction has no meta-information
}

void Adapter::Xaction::visitEachOption(libecap::NamedValueVisitor &) const
{
	// this transaction has no meta-information to pass to the visitor
}

void Adapter::Xaction::start()
{
	Must(hostx);

	// Check is host in injection list, returns injects list
	/*static const libecap::Name host("Host");
	hostx->virgin().header().value(host).toString()						// host seems to be empty often*/

	libecap::Area uri;													// Get Request-URI
	typedef const libecap::RequestLine *CLRLP;
	if(CLRLP requestLine = dynamic_cast<CLRLP>(&hostx->virgin().firstLine()))
		uri = requestLine->uri();
	else
	{
		if(CLRLP requestLine = dynamic_cast<CLRLP>(&hostx->cause().firstLine()))
			uri = requestLine->uri();
	}

	pInjector->compareHost(uri.toString(), pInjectVect);
//addToLog(pInjectVect->size() == 0 ? "NO" : "YES", (int)hostx);

	// adapt message header
	if(pInjectVect->size() > 0)
	{
		if(hostx->virgin().body())
		{
			receivingVb = opOn;
			hostx->vbMake();												// ask host to supply virgin body
		}
		else
		{
			receivingVb = opNever;											// we are not interested in vb if there is not one
		}

		libecap::shared_ptr<libecap::Message> adapted = hostx->virgin().clone();
		Must(adapted != 0);

		// delete ContentLength header because we may change the length unknown length may have performance implications for the host
		adapted->header().removeAny(libecap::headerContentLength);

		// add a custom header
		static const libecap::Name name("X-Ecap");
		const libecap::Header::Value value = libecap::Area::FromTempString(libecap::MyHost().uri());
		adapted->header().add(name, value);

		if(!adapted->body())
		{
			sendingAb = opNever;										// there is nothing to send
			lastHostCall()->useAdapted(adapted);
		}
		else
			hostx->useAdapted(adapted);
	}
	else																// we don't adapt this -> stops adaption immediately
		hostx->useVirgin();
}

void Adapter::Xaction::stop()
{
//addToLog("Adapter::Xaction::stop()", (int)hostx);
	hostx = NULL;
	// the caller will delete Xaction!!!

	delete pInjectVect;
	pInjectVect = NULL;
}

void Adapter::Xaction::abDiscard()
{
	Must(sendingAb == opUndecided);										// have not started yet
	sendingAb = opNever;

	// we do not need more vb if the host is not interested in ab
	stopVb();
}

void Adapter::Xaction::abMake()
{
	Must(sendingAb == opUndecided);										// have not yet started or decided not to send
	Must(hostx->virgin().body());										// that is our only source of ab content

	// we are or were receiving vb
	Must(receivingVb == opOn || receivingVb == opComplete);

	sendingAb = opOn;
	if(!buffer.empty())
		hostx->noteAbContentAvailable();
}

void Adapter::Xaction::abMakeMore()
{
	Must(receivingVb == opOn);											// a precondition for receiving more vb
	hostx->vbMakeMore();
}

void Adapter::Xaction::abStopMaking()
{
	sendingAb = opComplete;
	// we do not need more vb if the host is not interested in more ab
	stopVb();
}

libecap::Area Adapter::Xaction::abContent(size_type offset, size_type size)
{
	Must(sendingAb == opOn || sendingAb == opComplete);

	return libecap::Area::FromTempString(buffer.substr(offset, size));
}

void Adapter::Xaction::abContentShift(size_type size)
{
	Must(sendingAb == opOn || sendingAb == opComplete);

	buffer.erase(0, size);
}

void Adapter::Xaction::noteVbContentDone(bool atEnd)
{
	Must(receivingVb == opOn);
	receivingVb = opComplete;

	if(sendingAb == opOn)
	{
		hostx->noteAbContentDone(atEnd);
		sendingAb = opComplete;
	}
}

void Adapter::Xaction::noteVbContentAvailable()
{
	Must(receivingVb == opOn);

	const libecap::Area vb = hostx->vbContent(0, libecap::nsize);		// get all vb
	std::string chunk = vb.toString();									// expensive, but simple
	hostx->vbContentShift(vb.size);										// we have a copy; do not need vb any more

	adaptContent(chunk);
}

void Adapter::Xaction::adaptContent(std::string &chunk)
{
	// this is oversimplified; production code should worry about arbitrary chunk boundaries, content encodings, service reconfigurations, etc.

	string sci = pInjector->getSpaceifyInject(false);					// inject spaceifyclient only once per page!!!
	for(vector<pair<string::iterator, map<string, string> > >::iterator mit = pInjectVect->begin(); mit != pInjectVect->end(); mit++)
	{
		pair<string::iterator, map<string, string> > mapt = *mit;

		// if subject (inject_identifier) goes beyond chunk boundary the search can continue in next chunk because the iteration postion is stored
		string subject = mapt.second["inject_identifier"];
		string::iterator fit = mapt.first;
		string::iterator cit = chunk.begin();
		while(cit < chunk.end())
		{
			if(*fit == tolower(*cit))									// increment subject iterator each time a match is found
				fit++;
			else														// reset iterator if no match
				fit = subject.begin();

			if(fit == subject.end())									// subject was found in the chunk(s)
			{
				if(cit + 1 != chunk.end())
				{
					string temp = (foundCount == 0 ? sci : "") + mapt.second["inject_text"];
					chunk.insert(cit + 1 - chunk.begin(), temp);
				}
				else
				{
					if(foundCount == 0)
						chunk.append(sci);
					chunk.append(mapt.second["inject_text"]);
				}

				fit = subject.begin();

				foundCount++;

				break;
			}

			cit++;
		}

		pInjectVect->at(mit - pInjectVect->begin()).first = fit;		// store the iterator so that the search can continue in next chunk
	}

	buffer += chunk;													// buffer what we got
	if(sendingAb == opOn)
		hostx->noteAbContentAvailable();

	// Stop searching if everything is already found
	/*if(foundCount == pInjectVect->size())
	{
		//addToLog("ALL FOUND", 0);
		//sendingAb = opComplete;
		//hostx->noteAbContentAvailable();
		//hostx->vbStopMaking();
		//vbStop();
	}
	else
	{
		if(sendingAb == opOn)
			hostx->noteAbContentAvailable();
	}*/
}

bool Adapter::Xaction::callable() const
{
	return hostx != NULL;												// no point to call us if we are done
}

// tells the host that we are not interested in [more] vb if the host does not know that already
void Adapter::Xaction::stopVb()
{
	if(receivingVb == opOn)
	{
		hostx->vbStopMaking();
		receivingVb = opComplete;
	}
	else
		Must(receivingVb != opUndecided);								// we already got the entire body or refused it earlier
}

// this method is used to make the last call to hostx transaction, last call may delete adapter transaction if the host no longer needs it
// TODO: replace with hostx-independent "done" method
libecap::host::Xaction *Adapter::Xaction::lastHostCall()
{
//addToLog("libecap::host::Xaction *Adapter::Xaction::lastHostCall()", (int)hostx);
	if(pInjectVect)
		delete pInjectVect;
	pInjectVect = NULL;

	libecap::host::Xaction *x = hostx;
	Must(x);
	hostx = NULL;

	return x;
}

// create the adapter and register with libecap to reach the host application
static const bool Registered = (libecap::RegisterService(new Adapter::Service), true);
