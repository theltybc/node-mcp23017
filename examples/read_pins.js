const MCP23017 = require('../main.js');
const INTERVAL = 100;

let PIN = 0;
let address = 0x21;

let mcp = null;

(async function () {
  open();
  await setMode();
  while (1) {
    await read();
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
      await mcp.pinMode(PIN, mcp.INPUT);
      PIN++;
    } catch (err) {
      console.error("setMode", err);
    }
  }
  PIN = 0;
}

async function read() {
  PIN = 0;
  const state = [];
  while (PIN < 16) {
    try {
      state.push(await mcp.digitalRead());
      PIN++;
    } catch (err) {
      console.error(err);
    }
    await wait(INTERVAL);
  }
  console.log("read", state);
  PIN = 0;
}

function wait(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}
