/* include/autoconf.h.  Generated from autoconf.h.in by configure.  */
/* include/autoconf.h.in.  Generated from configure.ac by autoheader.  */

/* Define if building universal (internal helper macro) */
/* #undef AC_APPLE_UNIVERSAL_BUILD */

/* Defines how many threads aufs uses for I/O */
/* #undef AUFS_IO_THREADS */

/* If you are upset that the cachemgr.cgi form comes up with the hostname
   field blank, then define this to getfullhostname() */
/* #undef CACHEMGR_HOSTNAME */

/* Host type from configure */
#define CONFIG_HOST_TYPE "x86_64-pc-linux-gnu"

/* Default COSS membuf size */
#define COSS_MEMBUF_SZ 1048576

/* Define to one of `_getb67', `GETB67', `getb67' for Cray-2 and Cray-YMP
   systems. This function is required for `alloca.c' support on those systems.
   */
/* #undef CRAY_STACKSEG_END */

/* Define to 1 if using `alloca.c'. */
/* #undef C_ALLOCA */

/* Default FD_SETSIZE value */
#define DEFAULT_FD_SETSIZE 1024

/* The install prefix */
#define DEFAULT_PREFIX /usr

/* Enable following X-Forwarded-For headers */
#define FOLLOW_X_FORWARDED_FOR 1

/* If gettimeofday is known to take only one argument */
/* #undef GETTIMEOFDAY_NO_TZP */

/* Define to 1 if you have the <aio.h> header file. */
#define HAVE_AIO_H 1

/* Define to 1 if you have the <algorithm> header file. */
#define HAVE_ALGORITHM 1

/* Define to 1 if you have `alloca', as a function or macro. */
#define HAVE_ALLOCA 1

/* Define to 1 if you have <alloca.h> and it should be used (not on Ultrix).
   */
#define HAVE_ALLOCA_H 1

/* Define to 1 if you have the `argz_add' function. */
#define HAVE_ARGZ_ADD 1

/* Define to 1 if you have the `argz_append' function. */
#define HAVE_ARGZ_APPEND 1

/* Define to 1 if you have the `argz_count' function. */
#define HAVE_ARGZ_COUNT 1

/* Define to 1 if you have the `argz_create_sep' function. */
#define HAVE_ARGZ_CREATE_SEP 1

/* Define to 1 if you have the <argz.h> header file. */
#define HAVE_ARGZ_H 1

/* Define to 1 if you have the `argz_insert' function. */
#define HAVE_ARGZ_INSERT 1

/* Define to 1 if you have the `argz_next' function. */
#define HAVE_ARGZ_NEXT 1

/* Define to 1 if you have the `argz_stringify' function. */
#define HAVE_ARGZ_STRINGIFY 1

/* Define to 1 if you have the <arpa/inet.h> header file. */
#define HAVE_ARPA_INET_H 1

/* Define to 1 if you have the <arpa/nameser.h> header file. */
#define HAVE_ARPA_NAMESER_H 1

/* Define to 1 if you have the <assert.h> header file. */
#define HAVE_ASSERT_H 1

/* Define to 1 if you have __sync_add_and_fetch() and such */
#define HAVE_ATOMIC_OPS 1

/* Basic auth module is built */
#define HAVE_AUTH_MODULE_BASIC 1

/* Digest auth module is built */
#define HAVE_AUTH_MODULE_DIGEST 1

/* Negotiate auth module is built */
#define HAVE_AUTH_MODULE_NEGOTIATE 1

/* NTLM auth module is built */
#define HAVE_AUTH_MODULE_NTLM 1

/* Define to 1 if you have the `backtrace_symbols_fd' function. */
#define HAVE_BACKTRACE_SYMBOLS_FD 1

/* Define to 1 if you have the `bcopy' function. */
#define HAVE_BCOPY 1

/* Define to 1 if Heimdal krb5.h is broken for C++ */
/* #undef HAVE_BROKEN_HEIMDAL_KRB5_H */

/* Define to 1 if Solaris krb5.h is broken for C++ */
/* #undef HAVE_BROKEN_SOLARIS_KRB5_H */

/* Define to 1 if you have the <bstring.h> header file. */
/* #undef HAVE_BSTRING_H */

/* Define to 1 if you have the `bswap16' function. */
/* #undef HAVE_BSWAP16 */

/* Define to 1 if you have the `bswap32' function. */
/* #undef HAVE_BSWAP32 */

/* Define to 1 if you have the `bswap_16' function. */
/* #undef HAVE_BSWAP_16 */

/* Define to 1 if you have the `bswap_32' function. */
/* #undef HAVE_BSWAP_32 */

/* Define to 1 if you have the <byteswap.h> header file. */
#define HAVE_BYTESWAP_H 1

/* Define to 1 if you have the <cassert> header file. */
#define HAVE_CASSERT 1

/* Define to 1 if you have the <climits> header file. */
#define HAVE_CLIMITS 1

/* Define to 1 if you have the `closedir' function. */
#define HAVE_CLOSEDIR 1

/* Define to 1 if you have the <com_err.h> header file. */
#define HAVE_COM_ERR_H 1

/* Define to 1 if CMSG_SPACE is constant */
#define HAVE_CONSTANT_CMSG_SPACE 1

/* Define to 1 if you have the <cppunit/extensions/HelperMacros.h> header
   file. */
#define HAVE_CPPUNIT_EXTENSIONS_HELPERMACROS_H 1

/* Support setting CPU affinity for workers */
#define HAVE_CPU_AFFINITY 1

/* Define to 1 if you have the `crypt' function. */
#define HAVE_CRYPT 1

/* Define to 1 if you have the <crypt.h> header file. */
#define HAVE_CRYPT_H 1

/* Define to 1 if you have the <cstdarg> header file. */
#define HAVE_CSTDARG 1

/* Define to 1 if you have the <cstdlib> header file. */
#define HAVE_CSTDLIB 1

/* Define to 1 if you have the <cstring> header file. */
#define HAVE_CSTRING 1

/* Define to 1 if you have the <ctype.h> header file. */
#define HAVE_CTYPE_H 1

/* Define to 1 if you have the <db_185.h> header file. */
#define HAVE_DB_185_H 1

/* Define to 1 if you have the <db.h> header file. */
#define HAVE_DB_H 1

/* Define to 1 if you have the declaration of `cygwin_conv_path', and to 0 if
   you don't. */
/* #undef HAVE_DECL_CYGWIN_CONV_PATH */

/* Define to 1 if you have the declaration of `krb5_kt_free_entry', and to 0
   if you don't. */
#define HAVE_DECL_KRB5_KT_FREE_ENTRY 1

/* Define to 1 if you have the <dirent.h> header file, and it defines `DIR'.
   */
#define HAVE_DIRENT_H 1

/* Define if you have the GNU dld library. */
/* #undef HAVE_DLD */

/* Define to 1 if you have the <dld.h> header file. */
/* #undef HAVE_DLD_H */

/* Define to 1 if you have the `dlerror' function. */
#define HAVE_DLERROR 1

/* Define to 1 if you have the <dlfcn.h> header file. */
#define HAVE_DLFCN_H 1

/* Define to 1 if you have the <dl.h> header file. */
/* #undef HAVE_DL_H */

/* Define to 1 if you have the `drand48' function. */
#define HAVE_DRAND48 1

/* Define if you have the _dyld_func_lookup function. */
/* #undef HAVE_DYLD */

/* Define to 1 if you have the <errno.h> header file. */
#define HAVE_ERRNO_H 1

/* Define to 1 if you have error_message */
#define HAVE_ERROR_MESSAGE 1

/* Define to 1 if the system has the type `error_t'. */
#define HAVE_ERROR_T 1

/* Define to 1 if you have the <et/com_err.h> header file. */
#define HAVE_ET_COM_ERR_H 1

/* Define to 1 if you have the `eui64_aton' function. */
/* #undef HAVE_EUI64_ATON */

/* Define to 1 if you have the <execinfo.h> header file. */
#define HAVE_EXECINFO_H 1

/* Define to 1 if you have the <expat.h> header file. */
#define HAVE_EXPAT_H 1

/* Define to 1 if you have the `fchmod' function. */
#define HAVE_FCHMOD 1

/* Define to 1 if you have the <fcntl.h> header file. */
#define HAVE_FCNTL_H 1

/* fd_mask is defined by the system headers */
#define HAVE_FD_MASK 1

/* Define to 1 if you have the <fnmatch.h> header file. */
#define HAVE_FNMATCH_H 1

/* Define to 1 if you have the <fstream> header file. */
#define HAVE_FSTREAM 1

/* "Define to 1 if aufs filesystem module is build" */
#define HAVE_FS_AUFS 1

/* "Define to 1 if coss filesystem module is build" */
/* #undef HAVE_FS_COSS */

/* "Define to 1 if diskd filesystem module is build" */
#define HAVE_FS_DISKD 1

/* "Define to 1 if rock filesystem module is build" */
#define HAVE_FS_ROCK 1

/* "Define to 1 if ufs filesystem module is build" */
#define HAVE_FS_UFS 1

/* Define to 1 if you have the `getaddrinfo' function. */
#define HAVE_GETADDRINFO 1

/* Define to 1 if you have the `getdtablesize' function. */
#define HAVE_GETDTABLESIZE 1

/* Define to 1 if you have the `getnameinfo' function. */
#define HAVE_GETNAMEINFO 1

/* Define to 1 if you have the <getopt.h> header file. */
#define HAVE_GETOPT_H 1

/* Define to 1 if you have the `getpagesize' function. */
#define HAVE_GETPAGESIZE 1

/* Define to 1 if you have the `getpass' function. */
#define HAVE_GETPASS 1

/* Define to 1 if you have the `getrlimit' function. */
#define HAVE_GETRLIMIT 1

/* Define to 1 if you have the `getrusage' function. */
#define HAVE_GETRUSAGE 1

/* Define to 1 if you have the `getspnam' function. */
#define HAVE_GETSPNAM 1

/* Define to 1 if you have the `gettimeofday' function. */
#define HAVE_GETTIMEOFDAY 1

/* Define to 1 if you have krb5_get_init_creds_keytab */
#define HAVE_GET_INIT_CREDS_KEYTAB 1

/* Define to 1 if you have the <glib.h> header file. */
/* #undef HAVE_GLIB_H */

/* Define to 1 if you have the `glob' function. */
#define HAVE_GLOB 1

/* Define to 1 if you have the <glob.h> header file. */
#define HAVE_GLOB_H 1

/* Define to 1 if you have the <gnumalloc.h> header file. */
/* #undef HAVE_GNUMALLOC_H */

/* Define to 1 if you have the <grp.h> header file. */
#define HAVE_GRP_H 1

/* GSSAPI support */
#define HAVE_GSSAPI 1

/* Define to 1 if you have the <gssapi/gssapi_generic.h> header file. */
#define HAVE_GSSAPI_GSSAPI_GENERIC_H 1

/* Define to 1 if you have the <gssapi/gssapi.h> header file. */
#define HAVE_GSSAPI_GSSAPI_H 1

/* Define to 1 if you have the <gssapi/gssapi_krb5.h> header file. */
#define HAVE_GSSAPI_GSSAPI_KRB5_H 1

/* Define to 1 if you have the <gssapi.h> header file. */
#define HAVE_GSSAPI_H 1

/* Define to 1 if you have Heimdal Kerberos */
/* #undef HAVE_HEIMDAL_KERBEROS */

/* Define to 1 if you have the `htobe16' function. */
/* #undef HAVE_HTOBE16 */

/* Define to 1 if you have the `htole16' function. */
/* #undef HAVE_HTOLE16 */

/* Define to 1 if you have the `inet_ntop' function. */
#define HAVE_INET_NTOP 1

/* Define to 1 if you have the `inet_pton' function. */
#define HAVE_INET_PTON 1

/* Define to 1 if you have the `initgroups' function. */
#define HAVE_INITGROUPS 1

/* Define to 1 if you have the <inttypes.h> header file. */
#define HAVE_INTTYPES_H 1

/* Define to 1 if you have the `ioctl' function. */
#define HAVE_IOCTL 1

/* Define to 1 if you have the <iomanip> header file. */
#define HAVE_IOMANIP 1

/* Define to 1 if you have the <iosfwd> header file. */
#define HAVE_IOSFWD 1

/* Define to 1 if you have the <iostream> header file. */
#define HAVE_IOSTREAM 1

/* Define to 1 if you have the <Iphlpapi.h> header file. */
/* #undef HAVE_IPHLPAPI_H */

/* Define to 1 if you have the <ipl.h> header file. */
/* #undef HAVE_IPL_H */

/* Define to 1 if you have the <ip_compat.h> header file. */
/* #undef HAVE_IP_COMPAT_H */

/* Define to 1 if you have the <ip_fil_compat.h> header file. */
/* #undef HAVE_IP_FIL_COMPAT_H */

/* Define to 1 if you have the <ip_fil.h> header file. */
/* #undef HAVE_IP_FIL_H */

/* Define to 1 if you have the <ip_nat.h> header file. */
/* #undef HAVE_IP_NAT_H */

/* Define to 1 if you have the `kqueue' function. */
/* #undef HAVE_KQUEUE */

/* KRB5 support */
#define HAVE_KRB5 1

/* Define to 1 if you have krb5_get_error_message */
#define HAVE_KRB5_GET_ERROR_MESSAGE 1

/* Define to 1 if you have krb5_get_err_text */
/* #undef HAVE_KRB5_GET_ERR_TEXT */

/* Define to 1 if you have krb5_get_max_time_skew */
/* #undef HAVE_KRB5_GET_MAX_TIME_SKEW */

/* Define to 1 if you have krb5_get_profile */
#define HAVE_KRB5_GET_PROFILE 1

/* Define to 1 if you have the <krb5.h> header file. */
#define HAVE_KRB5_H 1

/* Define to 1 if you have krb5_kt_free_entry */
#define HAVE_KRB5_KT_FREE_ENTRY 1

/* Define if kerberos has MEMORY: cache support */
#define HAVE_KRB5_MEMORY_CACHE 1

/* Define to 1 if you have the <lber.h> header file. */
#define HAVE_LBER_H 1

/* LDAP support */
#define HAVE_LDAP 1

/* Define to 1 if you have ldapssl_client_init */
/* #undef HAVE_LDAPSSL_CLIENT_INIT */

/* Define to 1 if you have the <ldap.h> header file. */
#define HAVE_LDAP_H 1

/* Define to 1 if you have LDAP_REBINDPROC_CALLBACK */
/* #undef HAVE_LDAP_REBINDPROC_CALLBACK */

/* Define to 1 if you have LDAP_REBIND_FUNCTION */
/* #undef HAVE_LDAP_REBIND_FUNCTION */

/* Define to 1 if you have LDAP_REBIND_PROC */
#define HAVE_LDAP_REBIND_PROC 1

/* Define to 1 if you have LDAP_SCOPE_DEFAULT */
#define HAVE_LDAP_SCOPE_DEFAULT 1

/* Define to 1 if you have ldap_start_tls_s */
#define HAVE_LDAP_START_TLS_S 1

/* Define to 1 if you have ldap_url_desc2str */
#define HAVE_LDAP_URL_DESC2STR 1

/* Define to 1 if you have LDAPURLDesc.lud_scheme */
#define HAVE_LDAP_URL_LUD_SCHEME 1

/* Define to 1 if you have ldap_url_parse */
#define HAVE_LDAP_URL_PARSE 1

/* Define to 1 if you have the `cap' library (-lcap). */
#define HAVE_LIBCAP 1

/* Define to 1 if you have the <libc.h> header file. */
/* #undef HAVE_LIBC_H */

/* Define to 1 if you have the `dl' library (-ldl). */
#define HAVE_LIBDL 1

/* Define if libdlloader will be built on this platform */
#define HAVE_LIBDLLOADER 1

/* Define to 1 if you have the expat library */
#define HAVE_LIBEXPAT 1

/* Define to 1 if you have the `gnumalloc' library (-lgnumalloc). */
/* #undef HAVE_LIBGNUMALLOC */

/* Define to 1 if you have the `intl' library (-lintl). */
/* #undef HAVE_LIBINTL */

/* Define to 1 if you have the `malloc' library (-lmalloc). */
/* #undef HAVE_LIBMALLOC */

/* Define to 1 if you have the
   <libnetfilter_conntrack/libnetfilter_conntrack.h> header file. */
#define HAVE_LIBNETFILTER_CONNTRACK_LIBNETFILTER_CONNTRACK_H 1

/* Define to 1 if you have the
   <libnetfilter_conntrack/libnetfilter_conntrack_tcp.h> header file. */
#define HAVE_LIBNETFILTER_CONNTRACK_LIBNETFILTER_CONNTRACK_TCP_H 1

/* Define to 1 if you have the libxml2 library */
#define HAVE_LIBXML2 1

/* Define to 1 if you have the <libxml/HTMLparser.h> header file. */
#define HAVE_LIBXML_HTMLPARSER_H 1

/* Define to 1 if you have the <libxml/HTMLtree.h> header file. */
#define HAVE_LIBXML_HTMLTREE_H 1

/* Define to 1 if you have the <libxml/parser.h> header file. */
#define HAVE_LIBXML_PARSER_H 1

/* Define to 1 if you have the <limits> header file. */
#define HAVE_LIMITS 1

/* Define to 1 if you have the <limits.h> header file. */
#define HAVE_LIMITS_H 1

/* Define to 1 if you have the <linux/netfilter_ipv4.h> header file. */
#define HAVE_LINUX_NETFILTER_IPV4_H 1

/* Define to 1 if you have the <linux/posix_types.h> header file. */
#define HAVE_LINUX_POSIX_TYPES_H 1

/* Define to 1 if you have the <linux/types.h> header file. */
#define HAVE_LINUX_TYPES_H 1

/* Define to 1 if you have the <list> header file. */
#define HAVE_LIST 1

/* Define to 1 if you have the `lrand48' function. */
#define HAVE_LRAND48 1

/* Define this if a modern libltdl is already installed */
#define HAVE_LTDL 1

/* Define to 1 if you have the <machine/byte_swap.h> header file. */
/* #undef HAVE_MACHINE_BYTE_SWAP_H */

/* Define to 1 if you have the <mach-o/dyld.h> header file. */
/* #undef HAVE_MACH_O_DYLD_H */

/* Define to 1 if you have the `mallinfo' function. */
#define HAVE_MALLINFO 1

/* Define to 1 if you have the `mallocblksize' function. */
/* #undef HAVE_MALLOCBLKSIZE */

/* Define to 1 if you have the <malloc.h> header file. */
#define HAVE_MALLOC_H 1

/* Define to 1 if you have the `mallopt' function. */
#define HAVE_MALLOPT 1

/* Define to 1 if you have the <map> header file. */
#define HAVE_MAP 1

/* Define to 1 if you have the <math.h> header file. */
#define HAVE_MATH_H 1

/* Define to 1 if max_skew in struct krb5_context */
/* #undef HAVE_MAX_SKEW_IN_KRB5_CONTEXT */

/* Define to 1 if you have the `memcpy' function. */
#define HAVE_MEMCPY 1

/* Define to 1 if you have the `memmove' function. */
#define HAVE_MEMMOVE 1

/* Define to 1 if you have the <memory> header file. */
#define HAVE_MEMORY 1

/* Define to 1 if you have the <memory.h> header file. */
#define HAVE_MEMORY_H 1

/* Define to 1 if you have the `memset' function. */
#define HAVE_MEMSET 1

/* Define to 1 if you have MIT Kerberos */
#define HAVE_MIT_KERBEROS 1

/* Define to 1 if you have the `mkstemp' function. */
#define HAVE_MKSTEMP 1

/* Define to 1 if you have the `mktime' function. */
#define HAVE_MKTIME 1

/* mode_t is defined by the system headers */
#define HAVE_MODE_T 1

/* Define to 1 if you have the <mount.h> header file. */
/* #undef HAVE_MOUNT_H */

/* Mozilla LDAP SDK support */
/* #undef HAVE_MOZILLA_LDAP_SDK */

/* Define to 1 if you have the <mozldap/ldap.h> header file. */
/* #undef HAVE_MOZLDAP_LDAP_H */

/* Define to 1 if you have the `mstats' function. */
/* #undef HAVE_MSTATS */

/* mtyp_t is defined by the system headers */
/* #undef HAVE_MTYP_T */

/* Define to 1 if you have the <ndir.h> header file, and it defines `DIR'. */
/* #undef HAVE_NDIR_H */

/* Define to 1 if you have the <netdb.h> header file. */
#define HAVE_NETDB_H 1

/* Define to 1 if you have the <netinet/icmp6.h> header file. */
#define HAVE_NETINET_ICMP6_H 1

/* Define to 1 if you have the <netinet/if_ether.h> header file. */
#define HAVE_NETINET_IF_ETHER_H 1

/* Define to 1 if you have the <netinet/in.h> header file. */
#define HAVE_NETINET_IN_H 1

/* Define to 1 if you have the <netinet/in_systm.h> header file. */
#define HAVE_NETINET_IN_SYSTM_H 1

/* Define to 1 if you have the <netinet/ip6.h> header file. */
#define HAVE_NETINET_IP6_H 1

/* Define to 1 if you have the <netinet/ipl.h> header file. */
/* #undef HAVE_NETINET_IPL_H */

/* Define to 1 if you have the <netinet/ip_compat.h> header file. */
/* #undef HAVE_NETINET_IP_COMPAT_H */

/* Define to 1 if you have the <netinet/ip_fil_compat.h> header file. */
/* #undef HAVE_NETINET_IP_FIL_COMPAT_H */

/* Define to 1 if you have the <netinet/ip_fil.h> header file. */
/* #undef HAVE_NETINET_IP_FIL_H */

/* Define to 1 if you have the <netinet/ip.h> header file. */
#define HAVE_NETINET_IP_H 1

/* Define to 1 if you have the <netinet/ip_icmp.h> header file. */
#define HAVE_NETINET_IP_ICMP_H 1

/* Define to 1 if you have the <netinet/ip_nat.h> header file. */
/* #undef HAVE_NETINET_IP_NAT_H */

/* Define to 1 if you have the <netinet/tcp.h> header file. */
#define HAVE_NETINET_TCP_H 1

/* Define to 1 if you have the <net/if_arp.h> header file. */
#define HAVE_NET_IF_ARP_H 1

/* Define to 1 if you have the <net/if_dl.h> header file. */
/* #undef HAVE_NET_IF_DL_H */

/* Define to 1 if you have the <net/if.h> header file. */
#define HAVE_NET_IF_H 1

/* Define to 1 if you have the <net/pfvar.h> header file. */
/* #undef HAVE_NET_PFVAR_H */

/* Define to 1 if you have the <net/pf/pfvar.h> header file. */
/* #undef HAVE_NET_PF_PFVAR_H */

/* Define to 1 if you have the <net/route.h> header file. */
#define HAVE_NET_ROUTE_H 1

/* Define to 1 if nullptr is supported */
#define HAVE_NULLPTR 1

/* Define to 1 if nullptr_t is supported */
#define HAVE_NULLPTR_T 1

/* Define to 1 if you have the `opendir' function. */
#define HAVE_OPENDIR 1

/* OpenLDAP support */
#define HAVE_OPENLDAP 1

/* Define to 1 if you have the <openssl/engine.h> header file. */
#define HAVE_OPENSSL_ENGINE_H 1

/* Define to 1 if you have the <openssl/err.h> header file. */
#define HAVE_OPENSSL_ERR_H 1

/* Define to 1 if you have the <openssl/md5.h> header file. */
#define HAVE_OPENSSL_MD5_H 1

/* Define to 1 if you have the <openssl/opensslv.h> header file. */
#define HAVE_OPENSSL_OPENSSLV_H 1

/* Define to 1 if you have the <openssl/ssl.h> header file. */
#define HAVE_OPENSSL_SSL_H 1

/* Define to 1 if you have the <openssl/txt_db.h> header file. */
#define HAVE_OPENSSL_TXT_DB_H 1

/* Define to 1 if you have the <openssl/x509v3.h> header file. */
#define HAVE_OPENSSL_X509V3_H 1

/* Define to 1 if you have the <ostream> header file. */
#define HAVE_OSTREAM 1

/* pad128_t is defined in system headers */
/* #undef HAVE_PAD128_T */

/* Define to 1 if you have the <paths.h> header file. */
#define HAVE_PATHS_H 1

/* Define to 1 if you have the `poll' function. */
#define HAVE_POLL 1

/* Define to 1 if you have the <poll.h> header file. */
#define HAVE_POLL_H 1

/* Define to 1 if you have the `prctl' function. */
#define HAVE_PRCTL 1

/* Define if libtool can extract symbol lists from object files. */
#define HAVE_PRELOADED_SYMBOLS 1

/* Define to 1 if you have profile_get_integer */
#define HAVE_PROFILE_GET_INTEGER 1

/* Define to 1 if you have the <profile.h> header file. */
#define HAVE_PROFILE_H 1

/* Define to 1 if you have profile_release */
#define HAVE_PROFILE_RELEASE 1

/* Define to 1 if you have the `psignal' function. */
#define HAVE_PSIGNAL 1

/* Define to 1 if you have the `pthread_attr_setschedparam' function. */
#define HAVE_PTHREAD_ATTR_SETSCHEDPARAM 1

/* Define to 1 if you have the `pthread_attr_setscope' function. */
#define HAVE_PTHREAD_ATTR_SETSCOPE 1

/* Define to 1 if you have the `pthread_setschedparam' function. */
#define HAVE_PTHREAD_SETSCHEDPARAM 1

/* Define to 1 if you have the `pthread_sigmask' function. */
/* #undef HAVE_PTHREAD_SIGMASK */

/* Define to 1 if you have the `putenv' function. */
#define HAVE_PUTENV 1

/* Define to 1 if you have the <pwd.h> header file. */
#define HAVE_PWD_H 1

/* Define to 1 if you have the `random' function. */
#define HAVE_RANDOM 1

/* Define to 1 if you have the `readdir' function. */
#define HAVE_READDIR 1

/* Define to 1 if you have the `regcomp' function. */
#define HAVE_REGCOMP 1

/* Define to 1 if you have the `regexec' function. */
#define HAVE_REGEXEC 1

/* Define to 1 if you have the <regex.h> header file. */
#define HAVE_REGEX_H 1

/* Define to 1 if you have the `regfree' function. */
#define HAVE_REGFREE 1

/* Define to 1 if you have the <resolv.h> header file. */
#define HAVE_RESOLV_H 1

/* Define to 1 if you have the `res_init' function. */
/* #undef HAVE_RES_INIT */

/* Define to 1 if you have the `rint' function. */
#define HAVE_RINT 1

/* Define to 1 if Mac Darwin without sasl.h */
/* #undef HAVE_SASL_DARWIN */

/* Define to 1 if you have the <sasl.h> header file. */
/* #undef HAVE_SASL_H */

/* Define to 1 if you have the <sasl/sasl.h> header file. */
#define HAVE_SASL_SASL_H 1

/* Define to 1 if you have the `sbrk' function. */
#define HAVE_SBRK 1

/* Define to 1 if you have the `sched_getaffinity' function. */
#define HAVE_SCHED_GETAFFINITY 1

/* Define to 1 if you have the <sched.h> header file. */
#define HAVE_SCHED_H 1

/* Define to 1 if you have the `sched_setaffinity' function. */
#define HAVE_SCHED_SETAFFINITY 1

/* Define to 1 if you have the <security/pam_appl.h> header file. */
#define HAVE_SECURITY_PAM_APPL_H 1

/* Define to 1 if you have the `select' function. */
#define HAVE_SELECT 1

/* Define to 1 if you have the `seteuid' function. */
#define HAVE_SETEUID 1

/* Define to 1 if you have the `setgroups' function. */
#define HAVE_SETGROUPS 1

/* Define to 1 if you have the `setpgrp' function. */
#define HAVE_SETPGRP 1

/* Yay! Another Linux brokenness. Knowing that setresuid() exists is not
   enough, because RedHat 5.0 declares setresuid() but does not implement it.
   */
#define HAVE_SETRESUID 1

/* Define to 1 if you have the `setrlimit' function. */
/* #undef HAVE_SETRLIMIT */

/* Define to 1 if you have the `setsid' function. */
#define HAVE_SETSID 1

/* Define to 1 if you have the <shadow.h> header file. */
#define HAVE_SHADOW_H 1

/* Define if you have the shl_load function. */
/* #undef HAVE_SHL_LOAD */

/* Support shared memory features */
#define HAVE_SHM 1

/* Define to 1 if you have the `sigaction' function. */
#define HAVE_SIGACTION 1

/* Define to 1 if you have the <siginfo.h> header file. */
/* #undef HAVE_SIGINFO_H */

/* Define to 1 if you have the <signal.h> header file. */
#define HAVE_SIGNAL_H 1

/* Defined if struct sockaddr_in6 has sin6_len */
#define HAVE_SIN6_LEN_IN_SAI 0

/* Define if sockaddr_in has field sin_len */
#define HAVE_SIN_LEN_IN_SAI 0

/* Define to 1 if you have the `snprintf' function. */
#define HAVE_SNPRINTF 1

/* Define to 1 if you have the `socketpair' function. */
#define HAVE_SOCKETPAIR 1

/* socklen_t is defined by the system headers */
#define HAVE_SOCKLEN_T 1

/* SPNEGO support */
#define HAVE_SPNEGO 1

/* Define to 1 if you have the `srand48' function. */
#define HAVE_SRAND48 1

/* Define to 1 if you have the `srandom' function. */
#define HAVE_SRANDOM 1

/* Define to 1 if you have the <sstream> header file. */
#define HAVE_SSTREAM 1

/* Define if sockaddr_storage has field ss_len */
#define HAVE_SS_LEN_IN_SS 0

/* Define to 1 if you have the `statfs' function. */
#define HAVE_STATFS 1

/* set to 1 if our system has statvfs(), and if it actually works */
#define HAVE_STATVFS 1

/* Define to 1 if you have the <stdarg.h> header file. */
#define HAVE_STDARG_H 1

/* Define to 1 if you have the <stdbool.h> header file. */
#define HAVE_STDBOOL_H 1

/* Define if g++ supports C++0x features. */
#define HAVE_STDCXX_0X /**/

/* Define to 1 if you have the <stddef.h> header file. */
#define HAVE_STDDEF_H 1

/* Define to 1 if you have the <stdexcept> header file. */
#define HAVE_STDEXCEPT 1

/* Define to 1 if you have the <stdint.h> header file. */
#define HAVE_STDINT_H 1

/* Define to 1 if you have the <stdio.h> header file. */
#define HAVE_STDIO_H 1

/* Define to 1 if you have the <stdlib.h> header file. */
#define HAVE_STDLIB_H 1

/* Define to 1 if you have the `strerror' function. */
#define HAVE_STRERROR 1

/* Define to 1 if you have the <string> header file. */
#define HAVE_STRING 1

/* Define to 1 if you have the <strings.h> header file. */
#define HAVE_STRINGS_H 1

/* Define to 1 if you have the <string.h> header file. */
#define HAVE_STRING_H 1

/* Define to 1 if you have the `strlcat' function. */
/* #undef HAVE_STRLCAT */

/* Define to 1 if you have the `strlcpy' function. */
/* #undef HAVE_STRLCPY */

/* MacOS brokenness: strnstr() can overrun on that system */
/* #undef HAVE_STRNSTR */

/* Define to 1 if you have the `strsep' function. */
#define HAVE_STRSEP 1

/* Define to 1 if you have the `strtoll' function. */
#define HAVE_STRTOLL 1

/* Define to 1 if `ip_hl' is a member of `struct iphdr'. */
#define HAVE_STRUCT_IPHDR_IP_HL 1

/* The system provides struct mallinfo */
#define HAVE_STRUCT_MALLINFO 1

/* Define to 1 if `mxfast' is a member of `struct mallinfo'. */
/* #undef HAVE_STRUCT_MALLINFO_MXFAST */

/* The system provides struct rusage */
#define HAVE_STRUCT_RUSAGE 1

/* Define to 1 if `tm_gmtoff' is a member of `struct tm'. */
#define HAVE_STRUCT_TM_TM_GMTOFF 1

/* Sun LDAP SDK support */
/* #undef HAVE_SUN_LDAP_SDK */

/* Define to 1 if you have the <syscall.h> header file. */
#define HAVE_SYSCALL_H 1

/* Define to 1 if you have the `sysconf' function. */
#define HAVE_SYSCONF 1

/* Define to 1 if you have the `syslog' function. */
#define HAVE_SYSLOG 1

/* Define to 1 if you have the <syslog.h> header file. */
#define HAVE_SYSLOG_H 1

/* Define to 1 if you have the <sys/bitypes.h> header file. */
#define HAVE_SYS_BITYPES_H 1

/* Define to 1 if you have the <sys/bswap.h> header file. */
/* #undef HAVE_SYS_BSWAP_H */

/* Define to 1 if you have the <sys/capability.h> header file. */
#define HAVE_SYS_CAPABILITY_H 1

/* Define to 1 if you have the <sys/devpoll.h> header file. */
/* #undef HAVE_SYS_DEVPOLL_H */

/* Define to 1 if you have the <sys/dir.h> header file, and it defines `DIR'.
   */
/* #undef HAVE_SYS_DIR_H */

/* Define to 1 if you have the <sys/dl.h> header file. */
/* #undef HAVE_SYS_DL_H */

/* Define to 1 if you have the <sys/endian.h> header file. */
/* #undef HAVE_SYS_ENDIAN_H */

/* Define to 1 if you have the <sys/epoll.h> header file. */
#define HAVE_SYS_EPOLL_H 1

/* Define to 1 if you have the <sys/event.h> header file. */
/* #undef HAVE_SYS_EVENT_H */

/* Define to 1 if you have the <sys/file.h> header file. */
#define HAVE_SYS_FILE_H 1

/* Define to 1 if you have the <sys/ioctl.h> header file. */
#define HAVE_SYS_IOCTL_H 1

/* Define to 1 if you have the <sys/md5.h> header file. */
/* #undef HAVE_SYS_MD5_H */

/* Define to 1 if you have the <sys/mman.h> header file. */
#define HAVE_SYS_MMAN_H 1

/* Define to 1 if you have the <sys/mount.h> header file. */
#define HAVE_SYS_MOUNT_H 1

/* Define to 1 if you have the <sys/msg.h> header file. */
#define HAVE_SYS_MSG_H 1

/* Define to 1 if you have the <sys/ndir.h> header file, and it defines `DIR'.
   */
/* #undef HAVE_SYS_NDIR_H */

/* Define to 1 if you have the <sys/param.h> header file. */
#define HAVE_SYS_PARAM_H 1

/* Define to 1 if you have the <sys/prctl.h> header file. */
#define HAVE_SYS_PRCTL_H 1

/* Define to 1 if you have the <sys/resource.h> header file. */
#define HAVE_SYS_RESOURCE_H 1

/* Define to 1 if you have the <sys/select.h> header file. */
#define HAVE_SYS_SELECT_H 1

/* Define to 1 if you have the <sys/socket.h> header file. */
#define HAVE_SYS_SOCKET_H 1

/* Define to 1 if you have the <sys/sockio.h> header file. */
/* #undef HAVE_SYS_SOCKIO_H */

/* Define to 1 if you have the <sys/statvfs.h> header file. */
#define HAVE_SYS_STATVFS_H 1

/* Define to 1 if you have the <sys/stat.h> header file. */
#define HAVE_SYS_STAT_H 1

/* Define to 1 if you have the <sys/syscall.h> header file. */
#define HAVE_SYS_SYSCALL_H 1

/* Define to 1 if you have the <sys/sysctl.h> header file. */
#define HAVE_SYS_SYSCTL_H 1

/* Define to 1 if you have the <sys/time.h> header file. */
#define HAVE_SYS_TIME_H 1

/* Define to 1 if you have the <sys/types.h> header file. */
#define HAVE_SYS_TYPES_H 1

/* Define to 1 if you have the <sys/uio.h> header file. */
#define HAVE_SYS_UIO_H 1

/* Define to 1 if you have the <sys/un.h> header file. */
#define HAVE_SYS_UN_H 1

/* Define to 1 if you have the <sys/vfs.h> header file. */
#define HAVE_SYS_VFS_H 1

/* Define to 1 if you have the <sys/wait.h> header file. */
#define HAVE_SYS_WAIT_H 1

/* Define to 1 if you have the `tempnam' function. */
#define HAVE_TEMPNAM 1

/* Define to 1 if you have the `timegm' function. */
#define HAVE_TIMEGM 1

/* Define to 1 if you have the <time.h> header file. */
#define HAVE_TIME_H 1

/* Define to 1 if std::unique_ptr<T> is supported */
#define HAVE_UNIQUE_PTR 1

/* Define to 1 if you have the <unistd.h> header file. */
#define HAVE_UNISTD_H 1

/* System supports unix sockets */
#define HAVE_UNIXSOCKET 1

/* upad128_t is defined in system headers */
/* #undef HAVE_UPAD128_T */

/* Define to 1 if you have the <utime.h> header file. */
#define HAVE_UTIME_H 1

/* Define to 1 if you have the <valgrind/memcheck.h> header file. */
/* #undef HAVE_VALGRIND_MEMCHECK_H */

/* Define to 1 if you have the <varargs.h> header file. */
/* #undef HAVE_VARARGS_H */

/* The system implements a functional va_copy() */
#define HAVE_VA_COPY 1

/* Define to 1 if you have the `vsnprintf' function. */
#define HAVE_VSNPRINTF 1

/* Define to 1 if you have the <wchar.h> header file. */
#define HAVE_WCHAR_H 1

/* Define if you have PSAPI.DLL on Windows systems */
/* #undef HAVE_WIN32_PSAPI */

/* Define to 1 if you have the <winsock2.h> header file. */
/* #undef HAVE_WINSOCK2_H */

/* Define to 1 if you have the <winsock.h> header file. */
/* #undef HAVE_WINSOCK_H */

/* This value is set to 1 to indicate that the system argz facility works */
#define HAVE_WORKING_ARGZ 1

/* Define to 1 if you have the `write' function. */
#define HAVE_WRITE 1

/* Define to 1 if you have the `__res_init' function. */
#define HAVE___RES_INIT 1

/* Some systems have __va_copy instead of va_copy */
#define HAVE___VA_COPY 1

/* Enable ICAP client features in Squid */
#define ICAP_CLIENT 1

/* Enable support for Transparent Proxy on systems using FreeBSD IPFW-style
   firewalling. */
#define IPFW_TRANSPARENT 0

/* Enable support for IPF-style transparent proxying */
#define IPF_TRANSPARENT 0

/* A dangerous feature which causes Squid to kill its parent process
   (presumably the RunCache script) upon receipt of SIGTERM or SIGINT.
   Deprecated, Use with caution. */
#define KILL_PARENT_OPT 0

/* libcap2 headers are broken and clashing with glibc */
#define LIBCAP_BROKEN 1

/* libresolv.a has been hacked to export _dns_ttl_ */
/* #undef LIBRESOLV_DNS_TTL_HACK */

/* Enable support for Transparent Proxy on Linux via Netfilter */
#define LINUX_NETFILTER 1

/* Define if the OS needs help to load dependent libraries for dlopen(). */
/* #undef LTDL_DLOPEN_DEPLIBS */

/* Define to the system default library search path. */
#define LT_DLSEARCH_PATH "/lib:/usr/lib:/usr/lib/x86_64-linux-gnu/libfakeroot:/usr/local/lib:/lib/x86_64-linux-gnu:/usr/lib/x86_64-linux-gnu"

/* The archive extension */
#define LT_LIBEXT "a"

/* Define to the extension used for runtime loadable modules, say, ".so". */
#define LT_MODULE_EXT ".so"

/* Define to the name of the environment variable that determines the run-time
   module search path. */
#define LT_MODULE_PATH_VAR "LD_LIBRARY_PATH"

/* Define to the sub-directory in which libtool stores uninstalled libraries.
   */
#define LT_OBJDIR ".libs/"

/* If MAXPATHLEN has not been defined */
/* #undef MAXPATHLEN */

/* If we need to declare sys_errlist as extern */
#define NEED_SYS_ERRLIST 1

/* Define if dlsym() requires a leading underscore in symbol names. */
/* #undef NEED_USCORE */

/* Define to 1 if your C compiler doesn't accept -c and -o together. */
/* #undef NO_MINUS_C_MINUS_O */

/* Name of package */
#define PACKAGE "squid"

/* Define to the address where bug reports for this package should be sent. */
#define PACKAGE_BUGREPORT "http://bugs.squid-cache.org/"

/* Define to the full name of this package. */
#define PACKAGE_NAME "Squid Web Proxy"

/* Define to the full name and version of this package. */
#define PACKAGE_STRING "Squid Web Proxy 3.3.8"

/* Define to the one symbol short name of this package. */
#define PACKAGE_TARNAME "squid"

/* Define to the home page for this package. */
#define PACKAGE_URL ""

/* Define to the version of this package. */
#define PACKAGE_VERSION "3.3.8"

/* Defined to const or empty depending on the style used by the OS to refer to
   the PAM message dialog func */
#define PAM_CONV_FUNC_CONST_PARM const

/* Enable support for PF-style transparent proxying */
#define PF_TRANSPARENT 0

/* Print stack traces on fatal errors */
#define PRINT_STACK_TRACE 0

/* Compiler supports %zu printf macro */
#define PRIuSIZE "zu"

/* The size of `int64_t', as computed by sizeof. */
#define SIZEOF_INT64_T 8

/* The size of `long', as computed by sizeof. */
#define SIZEOF_LONG 8

/* The size of `off_t', as computed by sizeof. */
#define SIZEOF_OFF_T 8

/* The size of `size_t', as computed by sizeof. */
#define SIZEOF_SIZE_T 8

/* The size of `void *', as computed by sizeof. */
#define SIZEOF_VOID_P 8

/* Squid extended build info field for "squid -v" output */
/* #undef SQUID_BUILD_INFO */

/* configure command line used to configure Squid */
#define SQUID_CONFIGURE_OPTIONS " '--build=x86_64-linux-gnu' '--prefix=/usr' '--includedir=${prefix}/include' '--mandir=${prefix}/share/man' '--infodir=${prefix}/share/info' '--sysconfdir=/etc' '--localstatedir=/var' '--libexecdir=${prefix}/lib/squid3' '--srcdir=.' '--disable-maintainer-mode' '--disable-dependency-tracking' '--disable-silent-rules' '--datadir=/usr/share/squid3' '--sysconfdir=/etc/squid3' '--mandir=/usr/share/man' '--enable-inline' '--enable-async-io=8' '--enable-storeio=ufs,aufs,diskd,rock' '--enable-removal-policies=lru,heap' '--enable-delay-pools' '--enable-cache-digests' '--enable-underscores' '--enable-icap-client' '--enable-follow-x-forwarded-for' '--enable-auth-basic=DB,fake,getpwnam,LDAP,MSNT,MSNT-multi-domain,NCSA,NIS,PAM,POP3,RADIUS,SASL,SMB' '--enable-auth-digest=file,LDAP' '--enable-auth-negotiate=kerberos,wrapper' '--enable-auth-ntlm=fake,smb_lm' '--enable-external-acl-helpers=file_userip,kerberos_ldap_group,LDAP_group,session,SQL_session,unix_group,wbinfo_group' '--enable-url-rewrite-helpers=fake' '--enable-eui' '--enable-esi' '--enable-icmp' '--enable-zph-qos' '--enable-ecap' '--enable-ssl' '--enable-ssl-crtd' '--disable-translation' '--with-swapdir=/var/spool/squid3' '--with-logdir=/var/log/squid3' '--with-pidfile=/var/run/squid3.pid' '--with-filedescriptors=65536' '--with-large-files' '--with-default-user=proxy' '--enable-linux-netfilter' 'build_alias=x86_64-linux-gnu' 'CFLAGS=-g -O2 -fPIE -fstack-protector --param=ssp-buffer-size=4 -Wformat -Werror=format-security -Wall' 'LDFLAGS=-Wl,-Bsymbolic-functions -fPIE -pie -Wl,-z,relro -Wl,-z,now' 'CPPFLAGS=-D_FORTIFY_SOURCE=2' 'CXXFLAGS=-g -O2 -fPIE -fstack-protector --param=ssp-buffer-size=4 -Wformat -Werror=format-security'"

/* UDP receive buffer size */
#define SQUID_DETECT_UDP_SO_RCVBUF 212992

/* UDP send buffer size */
#define SQUID_DETECT_UDP_SO_SNDBUF 212992

/* Maximum number of open filedescriptors */
#define SQUID_MAXFD 65536

/* Define to enable SNMP monitoring of Squid */
#define SQUID_SNMP 1

/* "Define to 1 if the SSL_get_certificate crashes squid" */
/* #undef SQUID_SSLGETCERTIFICATE_BUGGY */

/* "Define to 1 if the TXT_DB uses OPENSSL_PSTRING data member" */
#define SQUID_SSLTXTDB_PSTRINGDATA 1

/* "Define to 1 to use squid workaround for buggy versions of
   sk_OPENSSL_PSTRING_value" */
/* #undef SQUID_STACKOF_PSTRINGDATA_HACK */

/* TCP receive buffer size */
#define SQUID_TCP_SO_RCVBUF 65535

/* TCP send buffer size */
#define SQUID_TCP_SO_SNDBUF 16384

/* "Define to 1 if the SSL_CTX_new and similar openSSL API functions require
   'const SSL_METHOD *'" */
#define SQUID_USE_CONST_SSL_METHOD 1

/* "Define to 1 to use squid workaround for SSL_get_certificate" */
#define SQUID_USE_SSLGETCERTIFICATE_HACK 1

/* "Define to 1 to use squid workaround for openssl IMPLEMENT_LHASH_* type
   conversion errors" */
#define SQUID_USE_SSLLHASH_HACK 1

/* If using the C implementation of alloca, define if you know the
   direction of stack growth for your system; otherwise it will be
   automatically deduced at runtime.
	STACK_DIRECTION > 0 => grows toward higher addresses
	STACK_DIRECTION < 0 => grows toward lower addresses
	STACK_DIRECTION = 0 => direction of growth unknown */
/* #undef STACK_DIRECTION */

/* Define to 1 if you have the ANSI C header files. */
#define STDC_HEADERS 1

/* Define to 1 if your <sys/time.h> declares `struct tm'. */
/* #undef TM_IN_SYS_TIME */

/* common adaptation support */
#define USE_ADAPTATION 1

/* Enable support for authentication */
#define USE_AUTH 1

/* Use Cache Digests for locating objects in neighbor caches. */
#define USE_CACHE_DIGESTS 1

/* Enable support for cbdata debug information */
#define USE_CBDATA_DEBUG 0

/* Enable chunked Memory Pools support (experimental) */
#define USE_CHUNKEDMEMPOOLS 0

/* Traffic management via "delay pools". */
#define USE_DELAY_POOLS 1

/* Use /dev/poll for the IO loop */
/* #undef USE_DEVPOLL */

/* DiskIO modules are expected to be available. */
#define USE_DISKIO 1

/* Whether POSIX AIO support is needed. Automatic */
#define USE_DISKIO_AIO 1

/* Whether pthreads support is needed. Automatic */
#define USE_DISKIO_DISKTHREADS 1

/* Enable DiskIO IpcIo module. */
#define USE_DISKIO_IPCIO 1

/* Use dnsserver processes instead of the internal DNS protocol support */
#define USE_DNSHELPER 0

/* Disable eCAP support */
#define USE_ECAP 1

/* Use epoll() for the IO loop */
#define USE_EPOLL 1

/* Use multi-language support on error pages */
#define USE_ERR_LOCALES 1

/* Enable Forw/Via database */
#define USE_FORW_VIA_DB 0

/* Define if we should use GNU regex */
#define USE_GNUREGEX 0

/* Define this to include code for the Hypertext Cache Protocol (HTCP) */
#define USE_HTCP 1

/* Define to enable code which volates the HTTP standard specification */
#define USE_HTTP_VIOLATIONS 1

/* Define to use Squid ICMP and Network Measurement features (highly
   recommended!) */
#define USE_ICMP 1

/* Support for Ident (RFC 931) lookups */
#define USE_IDENT 1

/* Enable support for IPv6 */
#define USE_IPV6 1

/* Use kqueue() for the IO loop */
/* #undef USE_KQUEUE */

/* Enable code for assisting in finding memory leaks. Not for the faint of
   heart */
#define USE_LEAKFINDER 0

/* use libcap to set capabilities required for TPROXY */
#define USE_LIBCAP 1

/* Enable support for QOS netfilter mark preservation */
#define USE_LIBNETFILTERCONNTRACK 1

/* Support Loadable Modules */
#define USE_LOADABLE_MODULES 1

/* Define this to make use of the OpenSSL libraries for MD5 calculation rather
   than Squid-supplied MD5 implementation or if building with SSL encryption
   */
#define USE_OPENSSL 1

/* Use poll() for the IO loop */
/* #undef USE_POLL */

/* Enable Zero Penalty Hit QOS. When set, Squid will alter the TOS field of
   HIT responses to help policing network traffic */
#define USE_QOS_TOS 1

/* Use select() for the IO loop */
/* #undef USE_SELECT */

/* Use Winsock select() for the IO loop */
/* #undef USE_SELECT_WIN32 */

/* Compile the ESI processor and Surrogate header support */
#define USE_SQUID_ESI 1

/* Define this to include code which lets you use ethernet addresses. This
   code uses API initially defined in 4.4-BSD. */
#define USE_SQUID_EUI 1

/* Define this to include code for SSL gatewaying support */
#define USE_SSL 1

/* Use ssl_crtd daemon */
#define USE_SSL_CRTD 1

/* Enable extensions on AIX 3, Interix.  */
#ifndef _ALL_SOURCE
/* # undef _ALL_SOURCE */
#endif
/* Enable GNU extensions on systems that have them.  */
#ifndef _GNU_SOURCE
/* # undef _GNU_SOURCE */
#endif
/* Enable threading extensions on Solaris.  */
#ifndef _POSIX_PTHREAD_SEMANTICS
/* # undef _POSIX_PTHREAD_SEMANTICS */
#endif
/* Enable extensions on HP NonStop.  */
#ifndef _TANDEM_SOURCE
/* # undef _TANDEM_SOURCE */
#endif
/* Enable general extensions on Solaris.  */
#ifndef __EXTENSIONS__
/* # undef __EXTENSIONS__ */
#endif


/* Enable useage of unlinkd */
#define USE_UNLINKD 1

/* Define to enable WCCP */
#define USE_WCCP 1

/* Define to enable WCCP V2 */
#define USE_WCCPv2 1

/* Enable code supporting MS Windows service mode */
#define USE_WIN32_SERVICE 0

/* Define to enable CPU profiling within Squid */
#define USE_XPROF_STATS 0

/* Version number of package */
#define VERSION "3.3.8"

/* Valgrind memory debugger support */
#define WITH_VALGRIND 0

/* Define WORDS_BIGENDIAN to 1 if your processor stores words with the most
   significant byte first (like Motorola and SPARC, unlike Intel). */
#if defined AC_APPLE_UNIVERSAL_BUILD
# if defined __BIG_ENDIAN__
#  define WORDS_BIGENDIAN 1
# endif
#else
# ifndef WORDS_BIGENDIAN
/* #  undef WORDS_BIGENDIAN */
# endif
#endif

/* Show malloc statistics in status page */
#define XMALLOC_STATISTICS 0

/* Enable support for the X-Accelerator-Vary HTTP header */
#define X_ACCELERATOR_VARY 0

/* Define to 1 if on MINIX. */
/* #undef _MINIX */

/* Define to 2 if the system does not provide POSIX.1 features except with
   this defined. */
/* #undef _POSIX_1_SOURCE */

/* Define to 1 if you need to in order for `stat' and other things to work. */
/* #undef _POSIX_SOURCE */

/* Nameserver Counter for IPv6 _res */
/* #undef _SQUID_RES_NSADDR6_COUNT */

/* If _res_ext structure has nsaddr_list member */
/* #undef _SQUID_RES_NSADDR6_LARRAY */

/* If _res structure has _ext.nsaddrs member */
/* #undef _SQUID_RES_NSADDR6_LPTR */

/* Nameserver counter for IPv4 _res */
/* #undef _SQUID_RES_NSADDR_COUNT */

/* If _res structure has ns_list member */
/* #undef _SQUID_RES_NSADDR_LIST */

/* Define for Solaris 2.5.1 so the uint32_t typedef from <sys/synch.h>,
   <pthread.h>, or <semaphore.h> is not used. If the typedef were allowed, the
   #define below would cause a syntax error. */
/* #undef _UINT32_T */

/* Define for Solaris 2.5.1 so the uint64_t typedef from <sys/synch.h>,
   <pthread.h>, or <semaphore.h> is not used. If the typedef were allowed, the
   #define below would cause a syntax error. */
/* #undef _UINT64_T */

/* Define for Solaris 2.5.1 so the uint8_t typedef from <sys/synch.h>,
   <pthread.h>, or <semaphore.h> is not used. If the typedef were allowed, the
   #define below would cause a syntax error. */
/* #undef _UINT8_T */

/* Include inline methods into header file */
#define _USE_INLINE_ 1

/* Define so that glibc/gnulib argp.h does not typedef error_t. */
/* #undef __error_t_defined */

/* Define to empty if `const' does not conform to ANSI C. */
/* #undef const */

/* Define to a type to use for `error_t' if it is not otherwise available. */
/* #undef error_t */

/* Define to `int' if <sys/types.h> doesn't define. */
/* #undef gid_t */

/* Define to the type of a signed integer type of width exactly 16 bits if
   such a type exists and the standard includes do not define it. */
/* #undef int16_t */

/* Define to the type of a signed integer type of width exactly 32 bits if
   such a type exists and the standard includes do not define it. */
/* #undef int32_t */

/* Define to the type of a signed integer type of width exactly 64 bits if
   such a type exists and the standard includes do not define it. */
/* #undef int64_t */

/* Define to the type of a signed integer type of width exactly 8 bits if such
   a type exists and the standard includes do not define it. */
/* #undef int8_t */

/* Define to `long int' if <sys/types.h> does not define. */
/* #undef off_t */

/* Define to `int' if <sys/types.h> does not define. */
/* #undef pid_t */

/* Define to `unsigned int' if <sys/types.h> does not define. */
/* #undef size_t */

/* Define to `int' if <sys/types.h> does not define. */
/* #undef ssize_t */

/* Define to `int' if <sys/types.h> doesn't define. */
/* #undef uid_t */

/* Define to the type of an unsigned integer type of width exactly 16 bits if
   such a type exists and the standard includes do not define it. */
/* #undef uint16_t */

/* Define to the type of an unsigned integer type of width exactly 32 bits if
   such a type exists and the standard includes do not define it. */
/* #undef uint32_t */

/* Define to the type of an unsigned integer type of width exactly 64 bits if
   such a type exists and the standard includes do not define it. */
/* #undef uint64_t */

/* Define to the type of an unsigned integer type of width exactly 8 bits if
   such a type exists and the standard includes do not define it. */
/* #undef uint8_t */
