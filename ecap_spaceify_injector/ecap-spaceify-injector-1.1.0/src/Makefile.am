EXTRA_DIST = \
	spaceify_injector.cc

lib_LTLIBRARIES = \
	ecap_spaceify_injector.la

noinst_HEADERS = \
	sample.h \
	\
	autoconf.h 

# modifying
ecap_spaceify_injector_la_SOURCES = spaceify_injector.cc sqlite3/sqlite3.c
ecap_spaceify_injector_la_LDFLAGS = -module -avoid-version $(libecap_LIBS)

# -shared -export-dynamic -Wl,-soname,ecap_noop_adapter.so

DISTCLEANFILES = \
        autoconf.h

AM_CPPFLAGS = -I$(top_srcdir)/src $(libecap_CFLAGS)

