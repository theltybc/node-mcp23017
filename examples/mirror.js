const MCP23017 = require('../main.js');
const INTERVAL = 100;

let PIN = 0;
let address = 0x21;

let mcp = null;

(async function () {
  open();
  await setMode();
  while (1) {
    await mirror();
  }
})();

function open() {
  // if (mcp) {
  //   mcp.wire.closeSync();
  // }
  mcp = null;
  while (!mcp) {
    try {
      mcp = new MCP23017({
        address: address,
        device: 0,
        debug: true,
      });
      console.log("init", address);
    } catch (err) {
      console.error("init", err);
    }
  }
  // address++;
  // if (address >= 128) {
  //   address = 0;
  //   val = !val;
  // }
}

async function setMode() {
  PIN = 0;
  while (PIN < 16) {
    try {
      await mcp.pinMode(PIN, PIN < 8 ? mcp.INPUT_PULLUP : mcp.OUTPUT);
      PIN++;
    } catch (err) {
      console.error("setMode", PIN, err);
    }
  }
  PIN = 0;
}

async function mirror() {
  PIN = 0;
  while (PIN < 8) {
    try {
      await mcp.digitalWrite(PIN + 8, await mcp.digitalRead(PIN) ? mcp.HIGH : mcp.LOW);
      PIN++;
    } catch (err) {
      console.error("blink", err);
    }
    await wait(INTERVAL);
  }
  console.log("blink");
  PIN = 0;
}


function wait(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}

