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
this.__poker = { cleanOutCardsFor, cleanOutsFor, createDeck, discountedOutsFor, drawEquityFor, nextCardOutcomes, outCleanlinessFor, showdownOutcomes };`, context);

function createSeededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function drawSeededCards(deck, count, random) {
  return Array.from({ length: count }, () => deck.splice(Math.floor(random() * deck.length), 1)[0]);
}

function createSeededHand(seed, boardCardCount) {
  const random = createSeededRandom(seed);
  const deck = Array.from(context.__poker.createDeck());
  return {
    heroCards: drawSeededCards(deck, 2, random),
    villainCards: drawSeededCards(deck, 2, random),
    boardCards: drawSeededCards(deck, boardCardCount, random)
  };
}

function assertDiscountInvariant(hand) {
  const cleanOutCards = Array.from(context.__poker.cleanOutCardsFor(hand));
  const cleanOuts = context.__poker.cleanOutsFor(hand);
  const discountedOuts = context.__poker.discountedOutsFor(hand);

  assert.equal(cleanOutCards.length, cleanOuts);
  assert.ok(discountedOuts >= 0, `Discounted outs went negative for ${JSON.stringify(hand)}`);
  assert.ok(
    discountedOuts <= cleanOuts,
    `Discounted outs ${discountedOuts} exceeded clean outs ${cleanOuts} for ${JSON.stringify(hand)}`
  );

  for (const outCard of cleanOutCards) {
    const cleanliness = context.__poker.outCleanlinessFor(hand, outCard);
    assert.ok(cleanliness >= 0, `Out cleanliness went negative for ${outCard} in ${JSON.stringify(hand)}`);
    assert.ok(cleanliness <= 1, `Out cleanliness exceeded 1 for ${outCard} in ${JSON.stringify(hand)}`);
  }
}

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
assert.deepEqual(Array.from(context.__poker.cleanOutCardsFor(bottomTwoPairAhead)), []);
assert.equal(context.__poker.cleanOutsFor(bottomTwoPairAhead), 0);
assert.equal(context.__poker.discountedOutsFor(bottomTwoPairAhead), 0);
assert.equal(context.__poker.showdownOutcomes(bottomTwoPairAhead).length, 990);
assert.equal(context.__poker.drawEquityFor(bottomTwoPairAhead), 0);

const aceHighAlreadyAhead = {
  heroCards: ["A♥", "J♦"],
  villainCards: ["K♣", "Q♦"],
  boardCards: ["5♥", "3♦", "6♠", "5♠"]
};

assert.equal(context.__poker.cleanOutsFor(aceHighAlreadyAhead), 0);
assert.deepEqual(Array.from(context.__poker.cleanOutCardsFor(aceHighAlreadyAhead)), []);
assert.equal(context.__poker.discountedOutsFor(aceHighAlreadyAhead), 0);

const straightDrawAlreadyAhead = {
  heroCards: ["5♣", "8♦"],
  villainCards: ["2♥", "3♠"],
  boardCards: ["7♥", "A♦", "9♣", "A♣"]
};

assert.deepEqual(Array.from(context.__poker.cleanOutCardsFor(straightDrawAlreadyAhead)).sort(), ["6♠", "6♥", "6♦", "6♣"].sort());
assert.equal(context.__poker.cleanOutsFor(straightDrawAlreadyAhead), 4);

const dirtyAceOuts = {
  heroCards: ["A♠", "3♣"],
  villainCards: ["K♦", "J♦"],
  boardCards: ["9♦", "7♥", "4♠", "J♣"]
};

assert.deepEqual(Array.from(context.__poker.cleanOutCardsFor(dirtyAceOuts)).sort(), ["A♥", "A♦", "A♣"].sort());
assert.equal(context.__poker.cleanOutsFor(dirtyAceOuts), 3);
assert.ok(context.__poker.discountedOutsFor(dirtyAceOuts) < context.__poker.cleanOutsFor(dirtyAceOuts));
assert.equal(context.__poker.drawEquityFor(dirtyAceOuts), 5.4);

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

for (let seed = 1; seed <= 750; seed += 1) {
  assertDiscountInvariant(createSeededHand(seed, 3));
  assertDiscountInvariant(createSeededHand(seed + 10000, 4));
}
