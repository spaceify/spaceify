<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=100%, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
	<meta name="product" content="Spaceify Edge">
	<meta name="description" content="Spaceify main layout">
	<meta name="author" content="Spaceify Inc.">

	<link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgo=">			{{# Favicon not required }}

	<script src="${edge_url_current}js/jquery-1.11.3.min.js"></script>
	<script src="${edge_url_current}libs/spaceifyinitialize.js"></script>

	<script>
		window.addEventListener("spaceifyReady", function()
			{
			window["spaceifyNet"] = new SpaceifyNet();
			window["spaceifyCache"] = new SpaceifyCache();

			spaceifyNet.initialize('${section}', '${locale}', '${language_smarty}', '${host_protocol}');

			if(typeof pageReady == "function")												{{# Call pageReady if child template has implemented it. }}
				pageReady();
			});
	</script>

	{{block head}}{{/block}}

	<title>{{block title}}Spaceify{{/block}}</title>
</head>
<body class="edgeBody" id="edgeBody">

	{{block body}}{{/block}}

	<div class="edgeCommon" id="edgeCommon">
		<div class="edgeLoading" style="display:none;" id="loading">						{{# Loading... div  }}
			<div class="edgeLoadingContent">
				<img src="${edge_url_current}images/ajax-loader.gif" id="imgLoading">${language.loading}&nbsp;&nbsp;
			</div>
		</div>

		<div class="edgeBackGroundPopUp" id="popUpBG">										{{# Pop up background div }}
		</div>
	</div>

</body>
</html>
