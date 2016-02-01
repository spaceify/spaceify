<div class="edgeTile">
	<div class="edgeTileImage">
		<img width="128" height="128" src="{$image}" id="dtile_{$manifest.unique_name|replace:'/':'_'}">
	</div>

	<div class="edgeTileInfo">
		<div class="edgeTileInfo">
			<div class="edgeTitle spacer" title="{$manifest.name}">{$manifest.name}</div>

			<div class="edgeItem">{#version#}{$manifest.version}</div>
			<div class="edgeItem">{$manifest.type|capitalize}</div>
			<div class="edgeItem">{$manifest.category|capitalize}</div>
		</div>
	</div>
</div>
