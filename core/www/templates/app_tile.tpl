<div class="edgeTile">

	<div class="edgeTileImage">
		<img width="128" height="128" src="{#PX#}" title="{#options_title#|replace:'%':$name}" onload="$SR.loadImage(this, '{$image}');">
	</div>

	<div class="edgeTileInfo">
		<div class="edgeTileInfoTitle spacer">{$name}</div>

		<div class="edgeTileInfoItem">{#version#}{$version}</div>
		<!--<div class="edgeTileInfoItem">{$type|truncate:'_'|capitalize}</div>-->
		
		<div class="edgeTileInfoItem">{$category|capitalize}</div>
	</div>

	{if $options}
		<div class="edgeTileSettings">
			<a href="#" onclick="return spaceify.showOptionsDialog('{$unique_name}');">
				<img width="32" height="32" src="{#PX#}" title="{#options_title#|replace:'%':$name}" onload="$SR.loadImage(this, '{$protocol}://{$edge_hostname}/images/gear.png')">
			</a>
		</div>
	{/if}

</div>
