console.log("Running state.js");
var Client = require('ssh2').Client;
const EventEmitter = require('events');

module.exports = class Device extends EventEmitter{
  constructor(successConnectCallback, disconnectCallback, failureConnectCallback){
    super();
    var self = this;
    //self = this;
    this.controllerConnected = false;
    this.soloConnected = false;
    this.versions = {
      sololink_version: " – ",
      gimbal_version: " – ",
      pixhawk_version: " – ",
      controller_version: " – ",
      ssid: " – ",
      password: " – "
    }
    this.controller_connection = new Client();
    this.solo_connection = new Client();

    this.controller_connection_params = {
        host: '10.1.1.1',
        port: 22,
        username: 'root',
        password: 'TjSDBkAu',
        readyTimeout: 2000
    }

    this.controller_connection.on('ready', function(er) {
        if(er){
          console.log("Connection ready but error with controller");
        } else {
            console.log('Controller :: ready');
            self.controllerConnected = true;
            successConnectCallback("controller");
            self.get_controller_version();
        }
    });
    this.controller_connection.on('error', function(er){
        console.log("Error connecting to controller");
        console.log(er);
        self.controller_connection.end(); //end the connection if we have an error
        failureConnectCallback("controller");
    });
    this.controller_connection.on('close', function(){
        console.log("Connection to controller closed");
        disconnectCallback('controller');
    });

    this.solo_connection_params = {
        host: '10.1.1.10',
        port: 22,
        username: 'root',
        password: 'TjSDBkAu',
        readyTimeout: 500
    }

    this.solo_connection.on('ready', function(er) {
        if(er){
          console.log("Error connecting to solo");
        } else {
            console.log('Solo :: ready');
            self.soloConnected = true;
            //When the Solo connection has been established, get the versions
            self.get_sololink_version(()=>{
              successConnectCallback("solo");  //Once we've parsed the vehicle versions, update!
            });
            self.get_pixhawk_version();
            self.get_gimbal_version();
            self.get_wifi_info();
        }
    });
    this.solo_connection.on('error', function(er){
        console.log("Error connecting to solo");
        console.log(er);
        failureConnectCallback("solo");
        self.solo_connection.end();
    });

    this.solo_connection.on('close', function(){
        console.log("Connection to Solo closed");
        disconnectCallback('solo');
    });
  }

  connect_to_controller() {
    console.log("connect_to_controller called");
    this.controller_connection.connect(this.controller_connection_params);
  };
  connect_to_solo(){
    console.log("Connect to solo called");
    this.solo_connection.connect(this.solo_connection_params);
  };

  disconnect(){
    console.log("disconnect()");
    if (this.controllerConnected === true){
      this.controller_connection.end();
      this.controllerConnected = false;
    }
    if (this.soloConnected === true) {
      this.solo_connection.end();
      this.soloConnected = false;
    }
  }

  sololink_config_request(connection, command, callback){
    //takes SSH connection and returns response from sololink_config
    console.log("sololink_config_request ", command);
    var version = '';
    connection.exec(command, function(err, stream){
      stream.on('data', function(data, stderr){
        if(stderr){
          console.log(command + " failed: " + stderr);
        }
        version = data.toString().trim();
        callback(version);
      });
    });
  }

  get_wifi_info(){
    console.log("get_controller_version()");
    var self = this;
    this.sololink_config_request(this.controller_connection, 'sololink_config --get-wifi-ssid', function(ssid){
      self.versions.ssid = ssid;
      self.sololink_config_request(self.controller_connection, 'sololink_config --get-wifi-password', function(password){
        self.versions.password = password;
        self.emit('updated_versions');
      });
    });
  }

  get_controller_version(){
    console.log("get_controller_version()");
    var self = this;
    var command = 'sololink_config --get-version artoo';
    this.sololink_config_request(this.controller_connection, command, function(version){
      self.versions.controller_version = version;
      self.emit('updated_versions');
    });
  };

  get_sololink_version(callback){
    //This one takes a callback so we can tell UI that Solo is connected
    console.log("get_sololink_version()");
    var command = 'sololink_config --get-version sololink';
    var self = this;
    this.sololink_config_request(this.solo_connection, command, function(version){
      self.versions.sololink_version = version;
      self.emit('updated_versions');
      callback();
    });
  }

  get_pixhawk_version(){
    console.log("get_pixhawk_version()");
    var self = this;
    var command = 'sololink_config --get-version pixhawk';
    this.sololink_config_request(this.solo_connection, command, function(version){
      self.versions.pixhawk_version = version;
      self.emit('updated_versions');
    });
  }


  get_gimbal_version(){
    //We can't get gimbal version from sololink_config :(
    //Pull it from a file instead
    console.log("get_gimbal_version()");
    var self = this;
    var filename = '/AXON_VERSION';
    var gimbal_version = '';
    this.solo_connection.sftp(function(err, sftp){
      if (err) throw err;
      var file = sftp.createReadStream(filename);
      var data = '';
      var chunk = '';
      file.on('readable', function() {
        while ((chunk=file.read()) != null) {
            data += chunk;
        }
      });
      file.on('end', function() {
        var gimbal_version = data.split('\n')[0].trim(); //just the value on the first line
        self.versions.gimbal_version = gimbal_version;
        self.emit('updated_versions');
      });
    });
  };
};
