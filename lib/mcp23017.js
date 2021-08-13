const i2c = require('i2c-bus');

const REGISTER_GPIOA = 0x00,
  REGISTER_GPIOB = 0x01,
  REGISTER_GPIOA_PULLUP = 0x0C,
  REGISTER_GPIOB_PULLUP = 0x0D,
  READ_GPIOA_ADDR = 0x12,
  READ_GPIOB_ADDR = 0x13,
  WRITE_GPIOA_ADDR = 0x14,
  WRITE_GPIOB_ADDR = 0x15;

const MCP23017 = (function () {
  MCP23017.prototype.HIGH = 1;
  MCP23017.prototype.LOW = 0;
  MCP23017.prototype.INPUT_PULLUP = 2;
  MCP23017.prototype.INPUT = 1;
  MCP23017.prototype.OUTPUT = 0;

  MCP23017.prototype.address = 0x20; //if the mcp has all adress lines pulled low

  MCP23017.prototype.dirAState = 0xff; //initial state of GPIO A bank
  MCP23017.prototype.dirBState = 0xff; //initial state of GPIO B bank

  MCP23017.prototype.dirAPullUpState = 0x0; //initial state of GPIO A pull up resistor state
  MCP23017.prototype.dirBPullUpState = 0x0; //initial state of GPIO B pull up resistor state

  MCP23017.prototype.gpioAState = 0x0; //initial state of GPIOS A
  MCP23017.prototype.gpioBState = 0x0; //initial state of GPIOS B

  function MCP23017(config) {
    this.address = config.address;
    this.mode = this.INPUT;
    this.debug = config.debug === true ? true : false;
    this.device = config.device !== null ? config.device : 1;
    this.wire = i2c.openSync(this.device);
    this._initGpioA();
    this._initGpioB();
  }

  //inits both registers as an input
  MCP23017.prototype.reset = async function () {
    this.dirBState = 0xff;
    this.dirAState = 0xff;
    await this._initGpioA();
    await this._initGpioB();
  };

  /*
    sets an pin as an INPUT or OUTPUT
  */
  MCP23017.prototype.pinMode = function (pin, dir) {
    if (dir !== this.INPUT && dir !== this.INPUT_PULLUP && dir !== this.OUTPUT) {
      throw new Error('invalid value: ' + dir);
    }
    if (isNaN(pin)) {
      throw new Error('pin is not a number: ' + pin);
    } else if (pin > 15 || pin < 0) {
      throw new Error('invalid pin: ' + pin);
    }

    //delegate to funktion that handles low level stuff
    return this._setGpioDir(
      pin >= 8 ? pin - 8 : pin,
      dir,
      pin >= 8 ? REGISTER_GPIOB : REGISTER_GPIOA,
      pin >= 8 ? REGISTER_GPIOB_PULLUP : REGISTER_GPIOA_PULLUP);
  };

  /*
    internally used to set the direction registers
  */
  MCP23017.prototype._setGpioDir = async function (pin, dir, registerDirection, registerPullUp) {
    var pinHexMask = Math.pow(2, pin),
      registerDir,
      registerPullUpDir;

    if (registerDirection === REGISTER_GPIOA) {
      if (dir === this.OUTPUT) {
        this.log('setting pin \'' + pin + '\' as an OUTPUT');
        this.dirAState &= (~pinHexMask);
      } else if (dir === this.INPUT || dir === this.INPUT_PULLUP) {
        this.log('setting pin \'' + pin + '\' as an INPUT');
        this.dirAState |= pinHexMask;
        if (dir === this.INPUT_PULLUP) {
          this.log('activate INPUT_PULLUP for pin \'' + pin + '\'');
          this.dirAPullUpState |= pinHexMask;
          registerPullUpDir = this.dirAPullUpState;
        } else {
          this.log('deactivate INPUT_PULLUP for pin \'' + pin + '\'');
          this.dirAPullUpState &= (~pinHexMask);
          registerPullUpDir = this.dirAPullUpState;
        }
      }
      registerDir = this.dirAState;
    } else if (registerDirection === REGISTER_GPIOB) {
      if (dir === this.OUTPUT) {
        this.log('setting pin \'' + pin + '\' as an OUTPUT');
        this.dirBState &= (~pinHexMask);
      } else if (dir === this.INPUT || dir === this.INPUT_PULLUP) {
        this.log('setting pin \'' + pin + '\' as an INPUT');
        this.dirBState |= pinHexMask;
        if (dir === this.INPUT_PULLUP) {
          this.log('activate INPUT_PULLUP for pin \'' + pin + '\'');
          this.dirBPullUpState |= pinHexMask;
          registerPullUpDir = this.dirBPullUpState;
        } else {
          this.log('deactivate INPUT_PULLUP for pin \'' + pin + '\'');
          this.dirBPullUpState &= (~pinHexMask);
          registerPullUpDir = this.dirBPullUpState;
        }
      }
      registerDir = this.dirBState;
    }

    await this._send(registerDirection, [registerDir]);
    this.log('pin:  ' + pin + ', register: ' + registerDirection + ', value: ' + registerDir);

    if (registerPullUpDir !== undefined) {
      await this._send(registerPullUp, [registerPullUpDir]);
      this.log('pin:  ' + pin + ', register: ' + registerPullUp + ', pull up value: ' + registerPullUpDir);
    }
  };

  MCP23017.prototype._setGpioAPinValue = function (pin, value) {
    this.gpioAState = this._setBit(this.gpioAState, pin, value);
    return this._send(WRITE_GPIOA_ADDR, [this.gpioAState]);
  };

  MCP23017.prototype._setGpioBPinValue = function (pin, value) {
    this.gpioBState = this._setBit(this.gpioBState, pin, value);
    return this._send(WRITE_GPIOB_ADDR, [this.gpioBState]);
  };

  MCP23017.prototype._setBit = function (value, bit, state) {
    var pinHexMask = Math.pow(2, bit);
    if (state) {
      return value |= pinHexMask;
    } else {
      return value &= ~pinHexMask;
    }
  };

  var allowedValues = [0, 1, true, false];
  MCP23017.prototype.digitalWrite = function (pin, value) {
    if (allowedValues.indexOf(value) < 0) {
      throw new Error('invalid value: ' + value);
    } else if (value === false) {
      value = this.LOW;
    } else if (value === true) {
      value = this.HIGH;
    }

    if (isNaN(pin)) {
      throw new Error('pin is not a number: ' + pin);
    } else if (pin > 15 || pin < 0) {
      throw new Error('invalid pin: ' + pin);
    } else if (pin < 8) {
      //Port A
      return this._setGpioAPinValue(pin, value);
    } else {
      //Port B
      pin -= 8;
      return this._setGpioBPinValue(pin, value);
    }
  };

  MCP23017.prototype.digitalRead = function (pin) {
    if (pin < 8) {
      read = this.readRegisterA();
    } else {
      read = this.readRegisterB();
    }
    return read.then(function (byte) {
      var pinMask = Math.pow(2, pin >= 8 ? pin - 8 : pin); //create a hexMask
      return (byte & pinMask) !== 0;
    });
  };

  MCP23017.prototype.readRegisterA = function () {
    return this._read(READ_GPIOA_ADDR);
  };

  MCP23017.prototype.readRegisterB = function () {
    return this._read(READ_GPIOB_ADDR);
  };

  MCP23017.prototype._initGpioA = function () {
    return Promise.all([
      this._send(REGISTER_GPIOA, [this.dirAState]), //Set Direction
      this._send(WRITE_GPIOA_ADDR, [0x0]) //clear all output states
    ]);
  };

  MCP23017.prototype._initGpioB = function () {
    return Promise.all([
      this._send(REGISTER_GPIOB, [this.dirBState]), //Set Direction
      this._send(WRITE_GPIOB_ADDR, [0x0]) //clear all output states
    ]);
  };

  MCP23017.prototype._send = function (cmd, values) {
    var buff = Buffer.from(values);
    return new Promise((resolve, reject) => {
      this.wire.writeI2cBlock(this.address, cmd, buff.length, buff, function (err, bytesWritten, buffer) {
        if (err) {
          reject(err);
        } else {
          resolve(buffer[0]);
        }
      });
    });
  };

  MCP23017.prototype._read = function (cmd) {
    const length = 1;
    const buff = Buffer.alloc(length);
    return new Promise((resolve, reject) => {
      this.wire.readI2cBlock(this.address, cmd, length, buff, function (err, bytesRead, buffer) {
        if (err) {
          reject(err);
        } else {
          resolve(buffer[0]);
        }
      });
    });
  };

  MCP23017.prototype.log = function (msg) {
    if (this.debug) {
      console.log(msg);
    }
  };

  return MCP23017;

})();

module.exports = MCP23017;
