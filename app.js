const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const rankValues = Object.fromEntries(ranks.map((rank, index) => [rank, index + 2]));

const opponentProfiles = [
  { name: "Tight regular", description: "value-heavy and careful on scary runouts", payoffMultiplier: 0.5 },
  { name: "Loose caller", description: "continues too wide after betting", payoffMultiplier: 1.1 },
  { name: "Aggressive reg", description: "barrels pressure turns and rivers", payoffMultiplier: 0.8 },
  { name: "Splashy whale", description: "overpays with one-pair hands", payoffMultiplier: 1.5 },
  { name: "Nit", description: "shuts down when draws complete", payoffMultiplier: 0.25 }
];

const betFractions = [0.25, 0.33, 0.5, 0.66, 0.75, 1];

const steps = [
  {
    key: "outs",
    label: "Count the next-card clean outs.",
    suffix: "outs",
    tolerance: 1,
    answer: (hand) => cleanOutsFor(hand),
    hint: "Count unseen turn/river cards that turn Hero from not winning into an outright winner against the dealt Villain hand."
  },
  {
    key: "discountedOuts",
    label: "Calculate discounted outs.",
    suffix: "outs",
    tolerance: 0.75,
    answer: (hand) => discountedOutsFor(hand),
    hint: "Count clean cards that turn Hero from not winning into an outright winner. The target is calculated from the actual remaining deck."
  },
  {
    key: "drawEquity",
    label: "Calculate exact showdown equity.",
    suffix: "%",
    tolerance: 1,
    answer: (hand) => drawEquityFor(hand),
    hint: "Estimate from your outs with rule of 4 on the flop or rule of 2 on the turn, then compare against the exact target."
  },
  {
    key: "potOdds",
    label: "Calculate the direct pot-odds price.",
    suffix: "%",
    tolerance: 1,
    answer: (hand) => potOddsFor(hand),
    hint: "Call amount divided by the final pot after Hero calls."
  },
  {
    key: "impliedOdds",
    label: "Calculate the implied-odds break-even price.",
    suffix: "%",
    tolerance: 1.5,
    answer: (hand) => impliedOddsFor(hand),
    hint: "Add the generated future payoff estimate to the final pot, then divide the call by that larger pot."
  },
  {
    key: "decision",
    label: "Should you call?",
    suffix: "",
    tolerance: 0,
    answer: (hand) => shouldCallFor(hand) ? "call" : "fold",
    hint: "Call when exact showdown equity is at least the calculated implied break-even price."
  }
];

const state = {
  mode: "step",
  hand: generateHand(),
  stepIndex: 0,
  selectedDecision: "",
  stepAwaitingNext: false
};

const elements = {
  stepMode: document.querySelector("#stepMode"),
  wholeMode: document.querySelector("#wholeMode"),
  newHand: document.querySelector("#newHand"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  scenarioFacts: document.querySelector("#scenarioFacts"),
  stepProgress: document.querySelector("#stepProgress"),
  answerForm: document.querySelector("#answerForm"),
  answerLabel: document.querySelector("#answerLabel"),
  inputSlot: document.querySelector("#inputSlot"),
  feedback: document.querySelector("#feedback"),
  submitButton: document.querySelector("#answerForm button[type='submit']")
};

function currentHand() {
  return state.hand;
}

function createDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => `${rank}${suit}`));
}

function drawCards(deck, count) {
  return Array.from({ length: count }, () => deck.splice(randomInteger(deck.length), 1)[0]);
}

function generateHand() {
  const deck = createDeck();
  const heroCards = drawCards(deck, 2);
  const villainCards = drawCards(deck, 2);
  const street = randomInteger(100) < 65 ? "Flop" : "Turn";
  const boardCards = drawCards(deck, street === "Flop" ? 3 : 4);
  const potStart = randomChipAmount(18, 120, 2);
  const betFraction = betFractions[randomInteger(betFractions.length)];
  const opponentBetThisStreet = Math.max(2, roundToChip(potStart * betFraction, 2));
  const pot = potStart + opponentBetThisStreet;
  const minimumStack = opponentBetThisStreet + 40;
  const heroStack = randomChipAmount(minimumStack, 420, 5);
  const opponentStack = randomChipAmount(minimumStack, 420, 5);
  const opponent = opponentProfiles[randomInteger(opponentProfiles.length)];
  const hand = {
    heroCards,
    villainCards,
    boardCards,
    hero: heroCards.join(" "),
    villain: villainCards.join(" "),
    board: boardCards.join(" "),
    potStart,
    heroBetThisStreet: 0,
    opponentBetThisStreet,
    pot,
    call: opponentBetThisStreet,
    street,
    heroStack,
    opponentStack,
    opponent,
    title: `${street} ${madeHandLabel(evaluateHand([...heroCards, ...boardCards]))} facing a ${betSizeLabel(opponentBetThisStreet, potStart)} bet`
  };

  hand.futurePayoff = futurePayoffFor(hand);
  hand.action = `Pot starts ${money(potStart)}. ${opponent.name} bets ${money(opponentBetThisStreet)} on the ${street.toLowerCase()}; Hero must call ${money(opponentBetThisStreet)}.`;
  hand.note = noteFor(hand);

  return hand;
}

function randomChipAmount(min, max, increment) {
  const stepsCount = Math.floor((max - min) / increment) + 1;
  return min + randomInteger(stepsCount) * increment;
}

function roundToChip(amount, increment = 1) {
  return Math.max(increment, Math.round(amount / increment) * increment);
}

function betSizeLabel(bet, potStart) {
  const fraction = bet / potStart;
  if (fraction < 0.4) return "small";
  if (fraction < 0.7) return "half-pot";
  if (fraction < 0.9) return "large";
  return "pot-sized";
}

function randomInteger(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error("randomInteger requires a positive integer maximum.");
  }

  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const rangeLimit = 0x100000000 - (0x100000000 % maxExclusive);
    const randomValues = new Uint32Array(1);

    do {
      cryptoObject.getRandomValues(randomValues);
    } while (randomValues[0] >= rangeLimit);

    return randomValues[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function remainingDeckFor(hand) {
  const usedCards = new Set([...hand.heroCards, ...hand.villainCards, ...hand.boardCards]);
  return createDeck().filter((card) => !usedCards.has(card));
}

function nextCardOutcomes(hand) {
  const currentHeroHand = evaluateHand([...hand.heroCards, ...hand.boardCards]);
  const currentResult = compareHands(
    currentHeroHand,
    evaluateHand([...hand.villainCards, ...hand.boardCards])
  );

  return remainingDeckFor(hand).map((nextCard) => {
    const nextBoard = [...hand.boardCards, nextCard];
    const nextHeroHand = evaluateHand([...hand.heroCards, ...nextBoard]);
    const result = compareHands(
      nextHeroHand,
      evaluateHand([...hand.villainCards, ...nextBoard])
    );

    return {
      card: nextCard,
      currentResult,
      improvesHero: compareHands(nextHeroHand, currentHeroHand) > 0,
      result
    };
  });
}

function cleanOutsFor(hand) {
  return nextCardOutcomes(hand).filter(({ currentResult, result }) => currentResult <= 0 && result > 0).length;
}

function discountedOutsFor(hand) {
  const outcomes = nextCardOutcomes(hand);
  const discountedOuts = outcomes.reduce((total, { currentResult, result }) => {
    if (currentResult > 0) return total;
    if (result > 0) return total + 1;
    return total;
  }, 0);

  return roundToTenth(discountedOuts);
}

function showdownOutcomes(hand) {
  const remainingDeck = remainingDeckFor(hand);
  const cardsToCome = 5 - hand.boardCards.length;

  if (cardsToCome === 1) {
    return remainingDeck.map((riverCard) => {
      const finalBoard = [...hand.boardCards, riverCard];
      const result = compareHands(
        evaluateHand([...hand.heroCards, ...finalBoard]),
        evaluateHand([...hand.villainCards, ...finalBoard])
      );

      return { cards: [riverCard], result };
    });
  }

  if (cardsToCome === 2) {
    const outcomes = [];
    for (let firstIndex = 0; firstIndex < remainingDeck.length - 1; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < remainingDeck.length; secondIndex += 1) {
        const turnCard = remainingDeck[firstIndex];
        const riverCard = remainingDeck[secondIndex];
        const finalBoard = [...hand.boardCards, turnCard, riverCard];
        const result = compareHands(
          evaluateHand([...hand.heroCards, ...finalBoard]),
          evaluateHand([...hand.villainCards, ...finalBoard])
        );

        outcomes.push({ cards: [turnCard, riverCard], result });
      }
    }

    return outcomes;
  }

  const result = compareHands(
    evaluateHand([...hand.heroCards, ...hand.boardCards]),
    evaluateHand([...hand.villainCards, ...hand.boardCards])
  );
  return [{ cards: [], result }];
}

function drawEquityFor(hand) {
  const outcomes = showdownOutcomes(hand);
  const equity = outcomes.reduce((total, { result }) => {
    if (result > 0) return total + 1;
    if (result === 0) return total + 0.5;
    return total;
  }, 0);

  return roundToTenth((equity / outcomes.length) * 100);
}

function potOddsFor(hand) {
  return roundToTenth((hand.call / (hand.pot + hand.call)) * 100);
}

function effectiveStackAfterCall(hand) {
  return Math.max(0, Math.min(hand.heroStack - hand.call, hand.opponentStack));
}

function futurePayoffFor(hand) {
  const effectiveBehind = effectiveStackAfterCall(hand);
  const streetMultiplier = hand.street === "Flop" ? 1.25 : 0.75;
  const payoff = hand.call * hand.opponent.payoffMultiplier * streetMultiplier;
  return Math.min(effectiveBehind, roundToChip(payoff, 1));
}

function impliedOddsFor(hand) {
  return roundToTenth((hand.call / (hand.pot + hand.call + hand.futurePayoff)) * 100);
}

function shouldCallFor(hand) {
  return drawEquityFor(hand) >= impliedOddsFor(hand);
}

function roundToTenth(number) {
  return Math.round(number * 10) / 10;
}

function cardRank(card) {
  return card.slice(0, -1);
}

function cardSuit(card) {
  return card.slice(-1);
}

function straightHighFromValues(values) {
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
  if (uniqueValues.includes(14)) uniqueValues.push(1);

  for (let index = 0; index <= uniqueValues.length - 5; index += 1) {
    const window = uniqueValues.slice(index, index + 5);
    if (window.every((value, offset) => value === window[0] - offset)) {
      return window[0] === 1 ? 5 : window[0];
    }
  }

  return null;
}

function evaluateHand(cards) {
  const values = cards.map((card) => rankValues[cardRank(card)]).sort((a, b) => b - a);
  const counts = new Map();
  const suitsToValues = new Map(suits.map((suit) => [suit, []]));

  cards.forEach((card) => {
    const value = rankValues[cardRank(card)];
    counts.set(value, (counts.get(value) || 0) + 1);
    suitsToValues.get(cardSuit(card)).push(value);
  });

  const groups = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flushValues = [...suitsToValues.values()]
    .find((suitedValues) => suitedValues.length >= 5)
    ?.sort((a, b) => b - a);
  const straightHigh = straightHighFromValues(values);
  const straightFlushHigh = flushValues ? straightHighFromValues(flushValues) : null;

  if (straightFlushHigh) return { score: [8, straightFlushHigh], label: "straight flush" };

  const quads = groups.find((group) => group.count === 4);
  if (quads) {
    const kicker = values.find((value) => value !== quads.value);
    return { score: [7, quads.value, kicker], label: "quads" };
  }

  const trips = groups.filter((group) => group.count === 3).map((group) => group.value);
  const pairs = groups.filter((group) => group.count === 2).map((group) => group.value);
  if (trips.length && (pairs.length || trips.length > 1)) {
    const fullHousePair = trips.length > 1 ? trips[1] : pairs[0];
    return { score: [6, trips[0], fullHousePair], label: "full house" };
  }

  if (flushValues) return { score: [5, ...flushValues.slice(0, 5)], label: "flush" };
  if (straightHigh) return { score: [4, straightHigh], label: "straight" };

  if (trips.length) {
    const kickers = values.filter((value) => value !== trips[0]).slice(0, 2);
    return { score: [3, trips[0], ...kickers], label: "three of a kind" };
  }

  if (pairs.length >= 2) {
    const topPairs = pairs.slice(0, 2);
    const kicker = values.find((value) => !topPairs.includes(value));
    return { score: [2, ...topPairs, kicker], label: "two pair" };
  }

  if (pairs.length === 1) {
    const kickers = values.filter((value) => value !== pairs[0]).slice(0, 3);
    return { score: [1, pairs[0], ...kickers], label: "one pair" };
  }

  return { score: [0, ...values.slice(0, 5)], label: "high card" };
}

function compareHands(firstHand, secondHand) {
  const length = Math.max(firstHand.score.length, secondHand.score.length);
  for (let index = 0; index < length; index += 1) {
    const firstValue = firstHand.score[index] || 0;
    const secondValue = secondHand.score[index] || 0;
    if (firstValue > secondValue) return 1;
    if (firstValue < secondValue) return -1;
  }

  return 0;
}

function madeHandLabel(evaluation) {
  return evaluation.label.replace(/^./, (character) => character.toUpperCase());
}

function noteFor(hand) {
  const outcomes = showdownOutcomes(hand);
  const wins = outcomes.filter(({ result }) => result > 0).length;
  const ties = outcomes.filter(({ result }) => result === 0).length;
  const losses = outcomes.length - wins - ties;
  const cleanOuts = cleanOutsFor(hand);
  const discountedOuts = discountedOutsFor(hand);
  const equity = drawEquityFor(hand);
  const price = impliedOddsFor(hand);
  const decision = shouldCallFor(hand) ? "call" : "fold";

  return `Villain was dealt ${hand.villain}. ${cleanOuts} next cards turn Hero from not winning into an outright winner, worth ${discountedOuts} discounted outs. For equity, ${wins} runouts win, ${ties} tie, and ${losses} lose from ${outcomes.length} possible runouts, or ${equity}% exact showdown equity. The implied break-even price is ${price}%, so this is a ${decision}.`;
}

function render() {
  const hand = currentHand();
  elements.stepMode.classList.toggle("active", state.mode === "step");
  elements.wholeMode.classList.toggle("active", state.mode === "whole");
  elements.scenarioTitle.textContent = hand.title;
  elements.scenarioFacts.innerHTML = tableFor(hand);

  if (state.mode === "step") {
    renderStepMode(hand);
  } else {
    renderWholeMode(hand);
  }
}

function money(amount) {
  return `$${amount}`;
}

function cardMarkup(card) {
  const isRed = card.includes("♥") || card.includes("♦");
  return `<span class="card ${isRed ? "red" : "black"}" aria-label="${card}">${card}</span>`;
}

function cardsMarkup(cards) {
  return cards.split(" ").map(cardMarkup).join("");
}

function boardLabelFor(hand) {
  return hand.street === "Flop" ? "Flop" : "Board through turn";
}

function tableFor(hand) {
  return `
    <section class="poker-table" aria-label="Poker table situation">
      <div class="felt-ring" aria-hidden="true"></div>

      <article class="seat seat-villain" aria-label="Villain seat">
        <div class="dealer-button" aria-label="Dealer button">D</div>
        <div class="avatar" aria-hidden="true">V</div>
        <div class="player-panel">
          <p class="player-name">Villain</p>
          <span class="player-stack">${money(hand.opponentStack)}</span>
          <span class="player-style">${hand.opponent.description}</span>
        </div>
        <div class="hole-cards villain-cards" aria-hidden="true">
          <span class="card back">?</span><span class="card back">?</span>
        </div>
        <div class="bet-chip-stack villain-bet" aria-label="Villain bet ${money(hand.opponentBetThisStreet)}">
          <span class="chip-stack" aria-hidden="true"><span></span><span></span><span></span></span>
          <strong>${money(hand.opponentBetThisStreet)}</strong>
        </div>
      </article>

      <article class="board-zone" aria-label="Board and pot">
        <div class="board-topline">
          <span class="street-badge">${hand.street}</span>
          <span class="action-badge">Facing bet</span>
        </div>
        <div class="board-cards" aria-label="${boardLabelFor(hand)}">${cardsMarkup(hand.board)}</div>
        <div class="pot-display" aria-label="Pot ${money(hand.pot)}">
          <span class="pot-label">Pot</span>
          <strong class="pot-number">${money(hand.pot)}</strong>
        </div>
        <p class="table-action">${hand.action}</p>
      </article>

      <article class="seat seat-hero" aria-label="Hero seat">
        <div class="avatar hero-avatar" aria-hidden="true">H</div>
        <div class="player-panel">
          <p class="player-name">Hero</p>
          <span class="player-stack">${money(hand.heroStack)}</span>
          <span class="player-style">To act</span>
        </div>
        <div class="hole-cards" aria-label="Hero hole cards">${cardsMarkup(hand.hero)}</div>
        <div class="bet-chip-stack hero-bet ${hand.heroBetThisStreet === 0 ? "is-empty" : ""}" aria-label="Hero committed ${money(hand.heroBetThisStreet)} this street">
          <span class="chip-stack" aria-hidden="true"><span></span><span></span></span>
          <strong>${money(hand.heroBetThisStreet)}</strong>
        </div>
        <div class="decision-prompt" aria-label="Amount to call">Call ${money(hand.call)}</div>
      </article>
    </section>
  `;
}

function renderStepMode(hand) {
  const step = steps[state.stepIndex];
  elements.stepProgress.hidden = false;
  elements.stepProgress.innerHTML = steps
    .map((item, index) => {
      const status = index < state.stepIndex ? "done" : index === state.stepIndex ? "current" : "";
      return `<span class="step-pill ${status}">${index + 1}. ${labelForPill(item.key)}</span>`;
    })
    .join("");
  elements.answerLabel.textContent = step.label;
  elements.inputSlot.innerHTML = inputFor(step.key, step.label);
  state.stepAwaitingNext = false;
  elements.submitButton.textContent = "Submit answer";
  setAnswerControlsDisabled(false);
  elements.feedback.className = "feedback";
  elements.feedback.innerHTML = `<strong>Tip:</strong> ${step.hint}`;
  focusFirstInput();
}

function renderWholeMode(hand) {
  elements.stepProgress.hidden = true;
  elements.answerLabel.textContent = "Do the full hand in your head, then enter every answer.";
  elements.inputSlot.innerHTML = `
    <input id="outsInput" name="outs" type="number" min="0" step="1" inputmode="numeric" placeholder="Clean outs" aria-label="Clean outs" required />
    <input id="discountedOutsInput" name="discountedOuts" type="number" min="0" step="0.5" inputmode="decimal" placeholder="Discounted outs" aria-label="Discounted outs" required />
    <input id="drawEquityInput" name="drawEquity" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Exact equity %" aria-label="Exact showdown equity percent" required />
    <input id="potOddsInput" name="potOdds" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Pot price %" aria-label="Direct pot odds percent" required />
    <input id="impliedOddsInput" name="impliedOdds" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Implied price %" aria-label="Implied odds break-even percent" required />
    ${decisionChoices("wholeDecision")}
  `;
  state.selectedDecision = "";
  state.stepAwaitingNext = false;
  elements.submitButton.textContent = "Submit answers";
  setAnswerControlsDisabled(false);
  elements.feedback.className = "feedback";
  elements.feedback.innerHTML = `<strong>Rapid-fire:</strong> Fill the calculated answers, then submit the hand once.`;
  focusFirstInput();
}

function labelForPill(key) {
  return {
    outs: "Outs",
    discountedOuts: "Discount",
    drawEquity: "Equity",
    potOdds: "Price",
    impliedOdds: "Implied",
    decision: "Call?"
  }[key];
}

function inputFor(key, label) {
  if (key === "decision") {
    return decisionChoices("stepDecision");
  }

  const placeholder = steps.find((step) => step.key === key)?.suffix || "";
  return `<input id="answerInput" name="answer" type="number" min="0" step="0.1" inputmode="decimal" placeholder="${placeholder}" aria-label="${label}" required />`;
}

function decisionChoices(name) {
  return `
    <div class="choice-grid" role="radiogroup" aria-label="Call decision">
      <button class="choice-button" data-choice="call" data-name="${name}" type="button" role="radio" aria-checked="false">Call</button>
      <button class="choice-button" data-choice="fold" data-name="${name}" type="button" role="radio" aria-checked="false">Fold</button>
    </div>
  `;
}

function focusFirstInput() {
  window.requestAnimationFrame(() => {
    const input = elements.inputSlot.querySelector("input");
    if (input) input.focus();
  });
}

function checkStepAnswer(formData) {
  if (state.stepAwaitingNext) {
    state.stepIndex += 1;
    state.selectedDecision = "";
    render();
    return;
  }

  const hand = currentHand();
  const step = steps[state.stepIndex];
  const expected = step.answer(hand);
  const received = step.key === "decision" ? state.selectedDecision : Number(formData.get("answer"));

  if (!received && step.key === "decision") {
    showFeedback(false, "Pick call or fold first.");
    return;
  }

  const result = evaluateAnswer(step, expected, received);
  const explanation = explanationFor(step, hand, expected);
  showFeedback(result.correct, `${result.message} ${explanation}`);

  if (result.correct) {
    setAnswerControlsDisabled(true);
    if (state.stepIndex === steps.length - 1) {
      elements.submitButton.textContent = "Hand complete";
      showFeedback(true, `${result.message} ${explanation} <strong>Hand complete.</strong> Tap New hand or switch modes to continue.`);
    } else {
      state.stepAwaitingNext = true;
      elements.submitButton.textContent = "Next step";
    }
  }
}

function checkWholeAnswers(formData) {
  const hand = currentHand();
  const answers = {
    outs: Number(formData.get("outs")),
    discountedOuts: Number(formData.get("discountedOuts")),
    drawEquity: Number(formData.get("drawEquity")),
    potOdds: Number(formData.get("potOdds")),
    impliedOdds: Number(formData.get("impliedOdds")),
    decision: state.selectedDecision
  };

  if (!answers.decision) {
    showFeedback(false, "Pick call or fold first.");
    return;
  }

  const results = steps.map((step) => {
    const expected = step.answer(hand);
    return { step, expected, received: answers[step.key], ...evaluateAnswer(step, expected, answers[step.key]) };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const allCorrect = correctCount === results.length;
  const lines = results
    .map(({ step, expected, received, correct }) => {
      const displayExpected = step.key === "decision" ? expected : `${expected}${step.suffix}`;
      const displayReceived = step.key === "decision" ? received : `${received}${step.suffix}`;
      return `<li>${correct ? "✅" : "❌"} ${labelForPill(step.key)}: you said ${displayReceived}; target ${displayExpected}</li>`;
    })
    .join("");

  const header = allCorrect ? "Perfect hand." : `${correctCount}/${results.length} close enough.`;
  showFeedback(allCorrect, `<strong>${header}</strong><ul>${lines}</ul><p>${hand.note}</p>`);
}

function evaluateAnswer(step, expected, received) {
  if (step.key === "decision") {
    const correct = received === expected;
    return {
      correct,
      message: correct ? `<strong>Correct.</strong> ${expected.toUpperCase()} is the play.` : `<strong>Not quite.</strong> This is a ${expected.toUpperCase()}.`
    };
  }

  const difference = Math.abs(Number(received) - Number(expected));
  const correct = difference <= step.tolerance;
  const target = `${expected}${step.suffix}`;
  return {
    correct,
    message: correct
      ? `<strong>Close enough.</strong> Target was ${target}.`
      : `<strong>Try again.</strong> Target is ${target}; your answer was outside the margin.`
  };
}

function explanationFor(step, hand, expected) {
  if (step.key === "outs") {
    return `${expected} unseen cards turn Hero from not winning into an outright winner on the next street.`;
  }
  if (step.key === "discountedOuts") {
    return `Clean cards that turn Hero into an outright winner count as 1 out, for ${expected} discounted outs.`;
  }
  if (step.key === "drawEquity") {
    return `All showdown wins and ties across ${showdownOutcomes(hand).length} possible runouts = ${expected}%.`;
  }
  if (step.key === "potOdds") {
    return `${money(hand.call)} / (${money(hand.pot)} + ${money(hand.call)}) = ${expected}%.`;
  }
  if (step.key === "impliedOdds") {
    return `${money(hand.call)} / (${money(hand.pot)} + ${money(hand.call)} + ${money(hand.futurePayoff)} future payoff) = ${expected}%.`;
  }
  if (step.key === "decision") {
    return `${drawEquityFor(hand)}% exact showdown equity vs ${impliedOddsFor(hand)}% implied break-even price. ${hand.note}`;
  }
  return hand.note;
}

function showFeedback(isGood, html) {
  elements.feedback.className = `feedback ${isGood ? "good" : "bad"}`;
  elements.feedback.innerHTML = html;
}

function setAnswerControlsDisabled(isDisabled) {
  elements.inputSlot.querySelectorAll("input, button").forEach((control) => {
    control.disabled = isDisabled;
  });
}

function resetHand(hand = state.hand) {
  state.hand = hand;
  state.stepIndex = 0;
  state.selectedDecision = "";
  state.stepAwaitingNext = false;
  render();
}

elements.stepMode.addEventListener("click", () => {
  state.mode = "step";
  resetHand();
});

elements.wholeMode.addEventListener("click", () => {
  state.mode = "whole";
  resetHand();
});

elements.newHand.addEventListener("click", () => resetHand(generateHand()));

elements.answerForm.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button) return;

  state.selectedDecision = button.dataset.choice;
  elements.answerForm.querySelectorAll(`[data-name="${button.dataset.name}"]`).forEach((choice) => {
    const selected = choice === button;
    choice.classList.toggle("selected", selected);
    choice.setAttribute("aria-checked", String(selected));
  });
});

elements.answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.answerForm);
  if (state.mode === "step") {
    checkStepAnswer(formData);
  } else {
    checkWholeAnswers(formData);
  }
});

resetHand();
