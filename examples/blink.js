const MCP23017 = require('node-mcp23017');
const INTERVAL = 100;

let PIN = 0;
let val = true;
let address = 0x21;

let mcp = null;

(async function () {
  open();
  await setMode();
  while (1) {
    await blink();
    val = !val;
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
      await mcp.pinMode(PIN, mcp.OUTPUT);
      PIN++;
    } catch (err) {
      console.error("setMode", err);
    }
  }
  PIN = 0;
}

async function blink() {
  PIN = 0;
  while (PIN < 16) {
    try {
      if (val) {
        mcp.digitalWrite(PIN, mcp.HIGH);
      } else {
        mcp.digitalWrite(PIN, mcp.LOW);
      }
      PIN++;
    } catch (err) {
      console.error("blink", err);
    }
    await wait(INTERVAL);
  }
  console.log("blink", val);
  PIN = 0;
}

function wait(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}
