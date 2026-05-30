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
this.__poker = { cleanOutsFor, discountedOutsFor, drawEquityFor, nextCardOutcomes, showdownOutcomes };`, context);

const bottomTwoPairAhead = {
  heroCards: ["3♥", "7♠"],
  villainCards: ["A♣", "K♣"],
  boardCards: ["7♥", "A♠", "3♦"]
};

const cleanCards = Array.from(
  context.__poker
    .nextCardOutcomes(bottomTwoPairAhead)
    .filter(({ currentResult, result }) => currentResult <= 0 && result > 0)
    .map(({ card }) => card)
).sort();

assert.deepEqual(cleanCards, []);
assert.equal(context.__poker.cleanOutsFor(bottomTwoPairAhead), 0);
assert.equal(context.__poker.discountedOutsFor(bottomTwoPairAhead), 0);
assert.equal(context.__poker.showdownOutcomes(bottomTwoPairAhead).length, 990);
assert.equal(context.__poker.drawEquityFor(bottomTwoPairAhead), 74.5);

const aceHighAlreadyAhead = {
  heroCards: ["A♥", "J♦"],
  villainCards: ["K♣", "Q♦"],
  boardCards: ["5♥", "3♦", "6♠", "5♠"]
};

assert.equal(context.__poker.cleanOutsFor(aceHighAlreadyAhead), 0);
assert.equal(context.__poker.discountedOutsFor(aceHighAlreadyAhead), 0);

const turnChopOnlyDraw = {
  heroCards: ["A♥", "K♥"],
  villainCards: ["A♣", "K♣"],
  boardCards: ["Q♦", "J♠", "2♦", "3♥"]
};

const improvingChops = Array.from(
  context.__poker
    .nextCardOutcomes(turnChopOnlyDraw)
    .filter(({ improvesHero, result }) => improvesHero && result === 0)
    .map(({ card }) => card)
).sort();

assert.ok(improvingChops.includes("T♠"));
assert.ok(improvingChops.includes("T♥"));
assert.ok(improvingChops.includes("T♦"));
assert.ok(improvingChops.includes("T♣"));
assert.equal(context.__poker.cleanOutsFor(turnChopOnlyDraw), 0);
assert.equal(context.__poker.discountedOutsFor(turnChopOnlyDraw), 0);
