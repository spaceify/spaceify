// Spaceify Core modules are in /volume/application/api/ (and spacelet.js is in /volume/application).
// Fibrous is a node module for synchronous function calls.
var fibrous = require("fibrous");
var Const = require("./api/constants");
var Config = require("./api/config")();
var WebSocketRPCClient = require("./api/websocketrpcclient");
var WebSocketRPCServer = require("./api/websocketrpcserver");

function ExampleSpacelet2()
{
  var self = this;
  var spaceifyRPCCore = new WebSocketRPCClient();
  var serviceRPCServer = new WebSocketRPCServer();
  var serviceRPCClient = new WebSocketRPCClient();

  self.start = fibrous( function()
  {
    try
    {
      // Open a connection to the Spaceify core.
      spaceifyRPCCore.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, subprotocol: Config.CORE_SUBPROTOCOL, persistent: true});

      // Create server (JSON-RPC WebSocket) for this application so that other applications can connect to it.
      serviceRPCServer.connect.sync({hostname: null, port: Const.FIRST_SERVICE_PORT});  // next service would get service_port + 1

      // Expose a method for the others to call.
      serviceRPCServer.exposeRPCMethod("sayHello", self, self.sayHello);

      // Register the provided service to the Spaceify Core.
      spaceifyRPCCore.sync.call("registerService", ["spaceify.org/services/example/spacelet2"], self);

      // Find the required service
      var service = spaceifyRPCCore.sync.call("findService", ["spaceify.org/services/example/sba1"], self);

      // Open a connection to the service.
      serviceRPCClient.sync.connect({hostname: Config.EDGE_HOSTNAME, port: service.port, persistent: true});

      // Notify Spaceify Core application was succesfully initialized.
      spaceifyRPCCore.sync.call("initialized", [true, null], self);
    }
    catch(err)
    {
      // Notify Spaceify Core application failed to initialize itself. The error message can be passed to the Core.
      spaceifyRPCCore.sync.call("initialized", [false, err.message], self);
      self.sync.stop();
    }
    finally
    {
      spaceifyRPCCore.sync.close();
    }
  });

  // Close connections.
  self.stop = fibrous( function()
  {
    if(serviceRPCServer != null)
      serviceRPCServer.sync.close();

    if(serviceRPCClient != null)
      serviceRPCClient.sync.close();
  });

  // Implement the exposed method. Get the datetime now from the sandboxed application.
  self.sayHello = fibrous( function(param)
  {
    var date = serviceRPCClient.sync.call("getCurrentDateTime", [], self);

    return "Hello, " + param + ". I am example/spacelet2. The date and time is now " + date + ".";
  });

}

// Start the application.
fibrous.run(function()
{
  example = new ExampleSpacelet2();
  example.sync.start();
});