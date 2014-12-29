var spaceletRPC = null;

window.addEventListener("load", function()
{
	spaceifyCore.startSpacelet("spaceify/example", "spaceify.org/services/example_service_1", function(err, data)
	{
		if(err)
			console.log(err);
		else
		{
			spaceletRPC = data;
			spaceletRPC.exposeRPCMethod("callMe", self, callMe);	// Application can call us

			spaceletRPC.call("exampleMethod", ["World"], self, function(err, data)
			{
				alert(data);
			});
		}
	});
});

window.addEventListener("unload", function()
{
	connectionClose();
});

function connectionClose()
{
	if(spaceletRPC)
	{
		spaceletRPC.close();
		spaceletRPC = null;
	}
}

function callMe()
{
	return "Calling Me";
}
