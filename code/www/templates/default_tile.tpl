<div class="edgeTile">
	<div class="edgeTileImage"><img src="{$image}"></div>

	<div class="edgeTileInfo">
		<div class="edgeTileInfo">
			<div class="edgeTileInfoTitle spacer" title="{$manifest.name}">{$manifest.name}</div>

			<div class="edgeTileInfoItem">{#version#}{$manifest.version}</div>
			<div class="edgeTileInfoItem">{$manifest.type|truncate:'_'|capitalize}</div>
			<div class="edgeTileInfoItem">{$manifest.category|capitalize}</div>
		</div>
	</div>
</div>
