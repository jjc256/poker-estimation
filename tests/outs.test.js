const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function createElementStub() {
  return {
    className: "",
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    dataset: {},
    disabled: false,
    innerHTML: "",
    textContent: "",
    value: "",
    addEventListener() {},
    focus() {},
    querySelector: createElementStub,
    querySelectorAll() {
      return [];
    },
    removeAttribute() {},
    setAttribute() {}
  };
}

const context = {
  console,
  document: {
    querySelector: createElementStub,
    querySelectorAll() {
      return [];
    }
  },
  FormData: class {},
  window: {
    requestAnimationFrame(callback) {
      callback();
    }
  }
};
context.globalThis = context;
vm.createContext(context);

const source = fs.readFileSync("app.js", "utf8");
vm.runInContext(`${source}
this.__poker = { cleanOutsFor, discountedOutsFor, drawEquityFor, nextCardOutcomes };`, context);

const bottomTwoPairAhead = {
  heroCards: ["3♥", "7♠"],
  villainCards: ["A♣", "K♣"],
  boardCards: ["7♥", "A♠", "3♦"]
};

const cleanCards = Array.from(
  context.__poker
    .nextCardOutcomes(bottomTwoPairAhead)
    .filter(({ improvesHero, result }) => improvesHero && result >= 0)
    .map(({ card }) => card)
).sort();

assert.deepEqual(cleanCards, ["3♠", "3♣", "7♦", "7♣"].sort());
assert.equal(context.__poker.cleanOutsFor(bottomTwoPairAhead), 4);
assert.equal(context.__poker.discountedOutsFor(bottomTwoPairAhead), 4);
assert.equal(context.__poker.drawEquityFor(bottomTwoPairAhead), 88.9);
