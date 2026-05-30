const steps = [
  {
    key: "outs",
    label: "Count the clean raw outs.",
    suffix: "outs",
    tolerance: 1,
    answer: (hand) => hand.outs,
    hint: "Start with the visible draw: flush cards, straight cards, and any clean overcards."
  },
  {
    key: "discountedOuts",
    label: "Estimate discounted outs.",
    suffix: "outs",
    tolerance: 1,
    answer: (hand) => hand.discountedOuts,
    hint: "Remove dirty cards for paired boards, dominated pairs, and reverse risk."
  },
  {
    key: "drawEquity",
    label: "Estimate equity from discounted outs.",
    suffix: "%",
    tolerance: 2,
    answer: (hand) => drawEquityFor(hand),
    hint: "Use discounted outs only: rule of 4 on the flop, rule of 2 on the turn."
  },
  {
    key: "potOdds",
    label: "Estimate the direct pot-odds price.",
    suffix: "%",
    tolerance: 2,
    answer: (hand) => potOddsFor(hand),
    hint: "Call divided by final pot after you call."
  },
  {
    key: "decision",
    label: "Should you call?",
    suffix: "",
    tolerance: 0,
    answer: (hand) => shouldCallFor(hand) ? "call" : "fold",
    hint: "Call when your estimated equity is at least the direct price the pot is laying."
  }
];

const hands = [
  {
    title: "Turn nut-flush draw vs sticky caller",
    hero: "A♠ 9♠",
    board: "K♠ 7♠ 2♦ Q♥",
    potStart: 60,
    action: "Pot starts $60. Villain bets $30 on the turn; Hero must call $30 to continue.",
    heroBetThisStreet: 0,
    opponentBetThisStreet: 30,
    pot: 90,
    call: 30,
    street: "Turn",
    heroStack: 220,
    opponentStack: 220,
    opponent: "Loose-passive Villain: pays off one-pair hands too often",
    outs: 9,
    discountedOuts: 9,
    note: "All nine spades are clean on the unpaired board and this is the nut-flush draw. The turn equity is about 18%, below the 25% direct price, so the disciplined table decision is a fold."
  },
  {
    title: "Flop open-ender with deep stacks",
    hero: "J♥ T♥",
    board: "9♣ 8♦ 2♠",
    potStart: 45,
    action: "Pot starts $45. Villain continuation-bets $15 on the flop; Hero must call $15.",
    heroBetThisStreet: 0,
    opponentBetThisStreet: 15,
    pot: 60,
    call: 15,
    street: "Flop",
    heroStack: 300,
    opponentStack: 285,
    opponent: "Aggressive regular Villain: barrels often but can fold scary rivers",
    outs: 8,
    discountedOuts: 7,
    note: "The straight has eight raw outs, discounted to seven because action can dry up or tough future spots can appear. Seven flop outs are about 28% equity, comfortably above the 20% direct price."
  },
  {
    title: "Dominated overcards on a wet flop",
    hero: "A♦ Q♣",
    board: "J♠ 8♠ 3♥",
    potStart: 35,
    action: "Pot starts $35. Tight Villain bets $35 on the flop; Hero must call $35.",
    heroBetThisStreet: 0,
    opponentBetThisStreet: 35,
    pot: 70,
    call: 35,
    street: "Flop",
    heroStack: 180,
    opponentStack: 170,
    opponent: "Tight value-bettor Villain: strong range, rarely pays missed top pair",
    outs: 6,
    discountedOuts: 3,
    note: "The six raw overcard outs are discounted hard because top pair can still be dominated and the wet board creates reverse risk. With only about 12% discounted equity and no realistic future help, this is a fold."
  },
  {
    title: "Combo draw against a station",
    hero: "Q♣ J♣",
    board: "T♣ 9♣ 4♦",
    potStart: 80,
    action: "Pot starts $80. Calling-station Villain bets $40 on the flop; Hero must call $40.",
    heroBetThisStreet: 0,
    opponentBetThisStreet: 40,
    pot: 120,
    call: 40,
    street: "Flop",
    heroStack: 360,
    opponentStack: 340,
    opponent: "Calling-station Villain: hates folding made hands",
    outs: 15,
    discountedOuts: 13,
    note: "After removing overlap and a couple dirty cards, thirteen discounted flop outs are still about 52% equity. That crushes the 25% direct price, so the call is clear."
  },
  {
    title: "Gutshot facing a big turn bet",
    hero: "7♦ 6♦",
    board: "A♣ 5♠ 4♥ K♠",
    potStart: 55,
    action: "Pot starts $55. Nit Villain bets $45 on the turn; Hero must call $45.",
    heroBetThisStreet: 0,
    opponentBetThisStreet: 45,
    pot: 100,
    call: 45,
    street: "Turn",
    heroStack: 160,
    opponentStack: 155,
    opponent: "Nit Villain: folds when the obvious straight completes",
    outs: 4,
    discountedOuts: 3,
    note: "The gutshot starts at four raw outs but one completion is discounted for poor realization and reverse risk. Three turn outs are only about 6% equity, far below the price."
  },
  {
    title: "Nut-flush draw with fold-proof villain",
    hero: "A♥ 5♥",
    board: "K♥ 8♥ 6♣ 2♠",
    potStart: 60,
    action: "Pot starts $60. Splashy Villain bets $20 on the turn; Hero must call $20.",
    heroBetThisStreet: 0,
    opponentBetThisStreet: 20,
    pot: 80,
    call: 20,
    street: "Turn",
    heroStack: 240,
    opponentStack: 210,
    opponent: "Splashy whale Villain: overcalls rivers with any king",
    outs: 9,
    discountedOuts: 9,
    note: "The nut-flush draw keeps all nine outs. Eighteen percent turn equity is close, but it is still under the 20% direct price, so this drill marks the table decision as a fold."
  }
];

const state = {
  mode: "step",
  handIndex: randomHandIndex(),
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
  return hands[state.handIndex];
}

function nextHandIndex() {
  return randomHandIndex(state.handIndex);
}

function randomHandIndex(excludedIndex = null) {
  const candidateIndexes = hands
    .map((_, index) => index)
    .filter((index) => hands.length === 1 || index !== excludedIndex);

  return candidateIndexes[randomInteger(candidateIndexes.length)];
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

function cardsToCome(hand) {
  return hand.street === "Flop" ? 2 : 1;
}

function drawEquityFor(hand) {
  const ruleMultiplier = cardsToCome(hand) === 2 ? 4 : 2;
  return Math.min(100, Math.round(hand.discountedOuts * ruleMultiplier));
}

function potOddsFor(hand) {
  return Math.round((hand.call / (hand.pot + hand.call)) * 100);
}

function shouldCallFor(hand) {
  return drawEquityFor(hand) >= potOddsFor(hand);
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
  const villainStyle = hand.opponent.replace(/^.*?Villain:\s*/, "");

  return `
    <section class="poker-table" aria-label="Poker table situation">
      <div class="felt-ring" aria-hidden="true"></div>

      <article class="seat seat-villain" aria-label="Villain seat">
        <div class="dealer-button" aria-label="Dealer button">D</div>
        <div class="avatar" aria-hidden="true">V</div>
        <div class="player-panel">
          <p class="player-name">Villain</p>
          <span class="player-stack">${money(hand.opponentStack)}</span>
          <span class="player-style">${villainStyle}</span>
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
  elements.submitButton.textContent = "Check";
  setAnswerControlsDisabled(false);
  elements.feedback.className = "feedback";
  elements.feedback.innerHTML = `<strong>Tip:</strong> ${step.hint}`;
  focusFirstInput();
}

function renderWholeMode(hand) {
  elements.stepProgress.hidden = true;
  elements.answerLabel.textContent = "Do the full hand in your head, then enter every answer.";
  elements.inputSlot.innerHTML = `
    <input id="outsInput" name="outs" type="number" min="0" step="1" inputmode="numeric" placeholder="Raw outs" aria-label="Raw outs" required />
    <input id="discountedOutsInput" name="discountedOuts" type="number" min="0" step="0.5" inputmode="decimal" placeholder="Discounted outs" aria-label="Discounted outs" required />
    <input id="drawEquityInput" name="drawEquity" type="number" min="0" step="1" inputmode="numeric" placeholder="Discounted equity %" aria-label="Discounted equity percent" required />
    <input id="potOddsInput" name="potOdds" type="number" min="0" step="1" inputmode="numeric" placeholder="Pot price %" aria-label="Direct pot odds percent" required />
    ${decisionChoices("wholeDecision")}
  `;
  state.selectedDecision = "";
  state.stepAwaitingNext = false;
  elements.submitButton.textContent = "Check";
  setAnswerControlsDisabled(false);
  elements.feedback.className = "feedback";
  elements.feedback.innerHTML = `<strong>Rapid-fire:</strong> Fill the table-read answers, then check the hand once.`;
  focusFirstInput();
}

function labelForPill(key) {
  return {
    outs: "Outs",
    discountedOuts: "Discount",
    drawEquity: "Equity",
    potOdds: "Price",
    decision: "Call?"
  }[key];
}

function inputFor(key, label) {
  if (key === "decision") {
    return decisionChoices("stepDecision");
  }

  const placeholder = steps.find((step) => step.key === key)?.suffix || "";
  return `<input id="answerInput" name="answer" type="number" min="0" step="0.5" inputmode="decimal" placeholder="${placeholder}" aria-label="${label}" required />`;
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
      : `<strong>Try again.</strong> Target is about ${target}; your answer was outside the margin.`
  };
}

function explanationFor(step, hand, expected) {
  if (step.key === "drawEquity") {
    return `${hand.discountedOuts} discounted outs × ${cardsToCome(hand) === 2 ? 4 : 2} ≈ ${expected}%.`;
  }
  if (step.key === "potOdds") {
    return `$${hand.call} / ($${hand.pot} + $${hand.call}) ≈ ${expected}%.`;
  }
  if (step.key === "decision") {
    return `${drawEquityFor(hand)}% discounted-out equity vs ${potOddsFor(hand)}% direct pot price. ${hand.note}`;
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

function resetHand(index = state.handIndex) {
  state.handIndex = index;
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

elements.newHand.addEventListener("click", () => resetHand(nextHandIndex()));

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
