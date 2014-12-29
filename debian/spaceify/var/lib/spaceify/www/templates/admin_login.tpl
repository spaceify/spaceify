<div class="edgeTile">

	<div class="edgeTileImage">
		<img src="{#PX#}" onload="$SR.loadImage(this, 'images/lock_open.png')">
	</div>

	<div class="edgeTileInfo">
		<div class="edgeTileInfoTitle spacer">{#adminlogin#}</div>

		<input class="edgeInput" type="password" name="password" id="password" placeholder="{#password#}" style="width: 124px;" onkeydown="if(spaceify.onEnterPress(event)) spaceify.adminLogIn();"/>

		<a href="#" class="edgeButtonLink" onclick="return spaceify.adminLogIn();">
			<div class="edgeButton" style="width: 124px;">
				{#login#}
			</div>
		</a>
	</div>

</div>
