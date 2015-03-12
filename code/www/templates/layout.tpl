<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=100%, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
	<meta name="product" content="Spaceify Edge">
	<meta name="description" content="Spaceify Edge">
	<meta name="author" content="Spaceify Team">

	<script type="text/javascript">																			{{# static engine.io.js and spaceifyclient.js }}
		${engineiojs|raw}
	</script>
	<script type="text/javascript">
		${spaceifyclientjs|raw}
	</script>

	<script>
		window.addEventListener("load", function()
			{
			var head = document.getElementsByTagName("head")[0] || document.documentElement;
			var dtags = [{ createtag: "link", context: head, href: "css/spaceify.css", type: "text/css", rel: "stylesheet", media: "screen" },
						 { createtag: "script", context: head, src: "js/jquery-1.11.1.min.js", type: "text/javascript" },
						 { createtag: "script", context: head,  src: "js/jsmart.js", type: "text/javascript" },
						 { createtag: "script", context: head, src: "js/jsmart_plugins.js", type: "text/javascript" },
						 { createtag: "script", context: head, src: "js/spaceify.js", type: "text/javascript" },
						 { id: "imgLoading", context: document, src: "images/ajax-loader.gif" }];
			$SR.loadResources(dtags, -1, function()
				{
				spaceify.setConfig('${language}', '${smartyLanguage}', '${smartyConfiguration}', '${section}', '${protocol}');

				if(typeof pageReady == "function")																// Does the child template define pageReady?
					pageReady();
				});
			});
	</script>

	{{block head}}{{/block}}

	<title>{{block title}}Spaceify{{/block}}</title>
</head>
<body>

	<div class="edgeContent" id="mainContent">
		{{block body}}{{/block}}

		<div class="edgeLoading" style="display:none;" id="loading">														{{# Loading... div  }}
			<div class="edgeLoadingContent">
				<img id="imgLoading">${kiwiLanguage.loading}&nbsp;&nbsp;
			</div>
		</div>

		<div class="edgeAlert" id="alert">																					{{# Alert div }}
		</div>

		<div class="edgeBackGroundPopUp" id="popUpBG">																		{{# Pop up background div }}
		</div>

		<iframe class="edgeOptionsFrame" id="edgeOptionsFrame" frameborder="0" marginheight="0" src="about:blank"></iframe>	{{# Options iframe }}

	</div>
</body>
</html>
