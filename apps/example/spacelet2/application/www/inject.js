var serviceRPC = null;

window.addEventListener("load", function()
{
  // Start the spacelet and request a JSON-RPC connection to the service.
  spaceifyCore.startSpacelet("example/spacelet2", "spaceify.org/services/example/spacelet2", false, function(err, data)
  {
    if(data)
    {
      // Remember the JSON-RPC connection to the service, call the service.
      if(data != null)
      {
        serviceRPC = data;
        serviceRPC.call("sayHello", ["World"], this, function(err, data)
          {
            alert(err ? err : data);
          });
        }
      else
        alert("Requested service not available.");
    }
    else
      console.log(err);
  });
});

window.addEventListener("unload", function()
{
  if(serviceRPC)
  {
    serviceRPC.close();
    serviceRPC = null;
  }
});