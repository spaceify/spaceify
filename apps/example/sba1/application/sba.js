// Spaceify Core modules are in /volume/application/api/ (and sba.js is in /volume/application).
// Fibrous is a node module for synchronous function calls.
var fibrous = require("fibrous");
var Const = require("./api/constants");
var Config = require("./api/config")();
var WebSocketRPCClient = require("./api/websocketrpcclient");
var WebSocketRPCServer = require("./api/websocketrpcserver");

function ExampleSBA1()
{
  var self = this;
  var spaceifyRPCCore = new WebSocketRPCClient();
  var serviceRPCServer = new WebSocketRPCServer();

  self.start = fibrous( function()
  {
    try
    {
      // Open a connection to the Spaceify core.
      spaceifyRPCCore.sync.connect({hostname: Config.EDGE_HOSTNAME, port: Config.CORE_PORT_WEBSOCKET, subprotocol: Config.CORE_SUBPROTOCOL, persistent: true});

      // Create server (JSON-RPC WebSocket) for this application so that other applications can connect to it.
      serviceRPCServer.connect.sync({hostname: null, port: Const.FIRST_SERVICE_PORT});  // next service would get service_port + 1

      // Expose a method for the others to call.
      serviceRPCServer.exposeRPCMethod("getCurrentDateTime", self, self.getCurrentDateTime);

      // Register the provided service to the Spaceify Core.
      spaceifyRPCCore.sync.call("registerService", ["spaceify.org/services/example/sba1"], self);

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

  // Close servers.
  self.stop = fibrous( function()
  {
    if(serviceRPCServer != null)
      serviceRPCServer.sync.close();
  });

  // Implement the exposed method.
  self.getCurrentDateTime = fibrous( function()
  {
    var date = new Date();
    date = date.getFullYear() + "-" +
    ("00" + (date.getMonth()+1)).slice(-2) + "-" +
    ("00" + date.getDate()).slice(-2) + " " +
    ("00" + date.getHours()).slice(-2) + ":" +
    ("00" + date.getMinutes()).slice(-2) + ":" +
    ("00" + date.getSeconds()).slice(-2);

    return date;
  });
  
}

// Start the application.
fibrous.run(function()
{
  example = new ExampleSBA1();
  example.sync.start();
});