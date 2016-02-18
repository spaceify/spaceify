/**
 * Spaceify configuration by Spaceify Inc. 28.1.2016
 *
 * @class SpaceifyConfig
 */

function SpaceifyConfig()
{
var self = this;

for(i in window.sconfig)
	self[i] = window.sconfig[i];
}
