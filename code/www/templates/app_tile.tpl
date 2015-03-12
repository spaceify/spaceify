<div class="edgeTile">

	<div class="edgeTileImage">
		<img width="128" height="128" src="{#PX#}" id="ati_{$manifest.unique_name}" onload="$SR.loadImage(this.id, '{$image}', '{$manifest.unique_name}');">
	</div>

	<div class="edgeTileInfo">
		<div class="edgeTileInfoTitle spacer">{$manifest.name}</div>

		<div class="edgeTileInfoItem">{#version#}{$manifest.version}</div>
		<!--<div class="edgeTileInfoItem">{$manifest.type|truncate:'_'|capitalize}</div>-->

		<div class="edgeTileInfoItem">{$manifest.developer.name}</div>

		<div class="edgeTileInfoItem">{$manifest.category|capitalize}</div>
	</div>

</div>
