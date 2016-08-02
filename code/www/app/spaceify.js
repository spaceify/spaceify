var spaceifyApp = angular.module("spaceifyApp", []);

	// INITIALIZE THE APPLICATION FIRST - LOAD SCRIPTS ETC. -- -- -- -- -- -- -- -- -- -- //
var initInjector = angular.injector(["ng"]);
var $q = initInjector.get("$q");
var $http = initInjector.get("$http");
var $window = initInjector.get("$window");

for(s in $window.spaceifyPage)													// Server injects this script tag to angular pages
	storage[s] = $window.spaceifyPage[s];

loadFiles()																			
.then(initializeSpaceify)
.then(bootstrapApplication);

function loadFiles()
	{
	var url = storage.url;
	var locales = storage.locales;

	var defer = $q.defer();
	var promises = [];

	angular.forEach(locales, function(locale)									// Get the language from the locales
		{
		promises.push(loadFile(url + "locales/" + locale + ".json", "locales", locale));
		});

	promises.push(loadFile(url + "libs/spaceifyinitialize.js", "initFile"));
	if(storage.section == "index")												// Tiles are displayed only(?) on the main page
		{
		promises.push(loadFile(url + "templates/tile.html", "tile"));
		promises.push(loadFile(url + "templates/apptile.html", "appTile"));
		promises.push(loadFile(url + "templates/admintile.html", "adminTile"));
		promises.push(loadFile(url + "templates/certificatetile.html", "certificateTile"));
		}

	promises.push(loadFile(url + "templates/head.html", "head"));				// All pages share the same body/head partial/directive
	promises.push(loadFile(url + "templates/body.html", "body"));				// see templates/body.html and templates/body.html

	$q.all(promises).then(function() { defer.resolve(); });

	return defer.promise;
	}

function loadFile(url, name, locale)
	{
	return $http.get(url).then(function(response)
		{
		if(locale)
			storage[name][locale] = response.data;
		else
			storage[name] = response.data;
		},
	function(errorResponse)
		{});
	}

function initializeSpaceify()
	{ // Add the script tag that loads the inject files - see libs/spaceifyinitialize.js and libs/inject/spaceify.csv (production; spaceify.min.csv)
	var script = $window.document.createElement("script");

	var doc = script.ownerDocument;
	var win = doc.defaultView || doc.parentWindow;

	script.id = "CUSTOMONLOAD";
	script.onload = function() { new SpaceifyInitalize().start(true); }
	script.src = win.URL.createObjectURL(new Blob([storage.initFile], {type: "application/javascript"}));
	var body = $window.document.getElementsByTagName("BODY")[0];
	body.parentNode.insertBefore(script, body.nextSibling);
	}

function bootstrapApplication()
	{
	angular.element(document).ready(function()
		{
		angular.bootstrap(document, ["spaceifyApp"]);
		});
	}

$window.addEventListener("spaceifyReady", function()
	{ // Injection is ready
	$window.document.getElementById("edgeBody").style.display = "block";			// Show the body now that the page is initialized

	if(typeof $window.pageReady == "function")
		pageReady();
	});

	// CONTROLLERS -- -- -- -- -- -- -- -- -- -- //
spaceifyApp.controller("bodyController", ["$scope", "$window", "$http", function($scope, $window, $http)
	{ // All pages have this controller
	$scope.src = {};
	$scope.manifest = {};

	$scope.safeApply = function(fn)
		{ // Get rid of "$apply already in progress errors" - https://coderwall.com/p/ngisma/safe-apply-in-angular-js
		var phase = this.$root.$$phase;
		if(phase == '$apply' || phase == '$digest')
			{
			if(fn && (typeof(fn) === 'function'))
				fn();
			}
		else
			this.$apply(fn);
		};

	$scope.getString = function(index)
		{ // E.g. {{ getString("spacelets") }}
		return storage.get(index);
		}

	$scope.loadCertificate = function()
		{
		new SpaceifyNet().loadCertificate();
		}
	}]);

	// DIRECTIVES -- -- -- -- -- -- -- -- -- -- //
spaceifyApp.directive("headDirective", function($compile, $timeout)
	{ // All pages share the same head partial - see templates/head.html
	return {
			restrict: "AE",
			bindToController: true,
			controller: "bodyController",
			link: function(scope, element, attr, controller, transcludeFn)
			{
			scope.safeApply(function()
				{
				var content = $compile(storage.head)(scope);
				element.append(content);
				});
			}
		};
	});
	
spaceifyApp.directive("bodyDirective", ["$rootScope", "$compile", function($rootScope, $compile)
	{  // All pages share the same body partial - see templates/body.html
	return {
			restrict: "AE",
			bindToController: true,
			controller: "bodyController",
			link: function(scope, element, attr, controller, transcludeFn)
			{
			// Use AngularJS internal event system to send messages to descendants
			// http://stackoverflow.com/questions/23506382/how-do-i-bind-to-a-custom-event-in-an-angularjs-directive
			element.bind("addTile", function(event)							// See for example libs/spaceifynet.js where this event is called
				{
				$rootScope.$broadcast("addTile", event.detail);
				});
				
			scope.safeApply(function()
				{ // Common <body> elements shared by all pages - see templates/body.html
				scope.src = storage.url;
				var content = $compile(storage.body)(scope);
				element.append(content);
				});
			}
		};
	}]);

spaceifyApp.directive("theTiles", ["$document", "$compile", "$timeout", function($document, $compile, $timeout)
	{ // See <the-tiles></the-tiles> in www/index.html
	return {
			restrict: "AE",
			bindToController: true,
			controller: "bodyController",
			link: function(scope, element, attr, controller, transcludeFn)
			{
			scope.$on("addTile", function(event, detail)
				{
				scope.manifest = (detail.manifest ? detail.manifest : {});
				scope.src = (detail.src ? detail.src : "");

				scope.safeApply(function()
					{
					var content = $compile(storage[detail.type])(scope);	// compile, bind to scope and append
					$("#" + detail.container).append(content);

					if(typeof detail.callback == "function")
						$timeout(detail.callback, 10);
					});
				});
			}
		};
	}]);

	// FILTERS -- -- -- -- -- -- -- -- -- -- //
spaceifyApp.filter("replace", function()
	{
	return function(input, find, replace_)
		{
    	return input.replace(find, replace_);
		};
	});
	
spaceifyApp.filter("capitalize", function()
	{
	return function(input)
		{
    	return input.charAt(0).toUpperCase() + input.slice(1);
		};
	});
	
spaceifyApp.filter("trustasresourceurl", ["$sce", function($sce)
	{
	return function(input)
		{
		return $sce.trustAsResourceUrl(input);
		};
	}]);
	