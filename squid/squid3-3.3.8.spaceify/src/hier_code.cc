/*
 * Auto-Generated File. Changes will be destroyed.
 */
#include "squid.h"
#include "hier_code.h"

const char *hier_code_str[] = {
	"HIER_NONE",
	"HIER_DIRECT",
	"SIBLING_HIT",
	"PARENT_HIT",
	"DEFAULT_PARENT",
	"SINGLE_PARENT",
	"FIRSTUP_PARENT",
	"FIRST_PARENT_MISS",
	"CLOSEST_PARENT_MISS",
	"CLOSEST_PARENT",
	"CLOSEST_DIRECT",
	"NO_DIRECT_FAIL",
	"SOURCE_FASTEST",
	"ROUNDROBIN_PARENT",
#if USE_CACHE_DIGESTS
	"CD_PARENT_HIT",
	"CD_SIBLING_HIT",
#endif
	"CARP",
	"ANY_OLD_PARENT",
	"USERHASH_PARENT",
	"SOURCEHASH_PARENT",
	"PINNED",
	"ORIGINAL_DST",
	"HIER_MAX"
};
