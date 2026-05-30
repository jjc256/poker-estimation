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
    hint: "Remove dirty cards for paired boards, dominated pairs, and reverse implied odds."
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
    key: "impliedOdds",
    label: "Estimate implied-odds break-even equity.",
    suffix: "%",
    tolerance: 3,
    answer: (hand) => impliedOddsFor(hand),
    hint: "Add realistic future payoff from the effective stack and opponent style, then divide call by that larger final pot."
  },
  {
    key: "decision",
    label: "Should you call?",
    suffix: "",
    tolerance: 0,
    answer: (hand) => shouldCallFor(hand) ? "call" : "fold",
    hint: "Call when discounted-out equity is at least the implied-odds break-even price."
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
    expectedFutureWin: 18,
    outs: 9,
    discountedOuts: 9,
    note: "All nine spades are clean on the unpaired board and this is the nut-flush draw. The turn equity is about 18%, while even a loose payoff assumption only lowers the break-even point to about 22%, so the price is still too high."
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
    expectedFutureWin: 30,
    outs: 8,
    discountedOuts: 7,
    note: "The straight has eight raw outs, discounted to seven because action can dry up or reverse-implied spots can appear. Seven flop outs are about 28% equity, comfortably above the implied break-even price."
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
    expectedFutureWin: 0,
    outs: 6,
    discountedOuts: 3,
    note: "The six raw overcard outs are discounted hard because top pair can still be dominated and the wet board creates reverse implied odds. With only about 12% discounted equity and no realistic future payoff, this is a fold."
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
    expectedFutureWin: 60,
    outs: 15,
    discountedOuts: 13,
    note: "After removing overlap and a couple dirty cards, thirteen discounted flop outs are still about 52% equity. The station's stack and payoff tendency add implied value, so the call is clear."
  },
  {
    title: "Gutshot with bad implied odds",
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
    expectedFutureWin: 0,
    outs: 4,
    discountedOuts: 3,
    note: "The gutshot starts at four raw outs but one completion is discounted for poor payoff and reverse-implied risk. Three turn outs are only about 6% equity, far below the price."
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
    expectedFutureWin: 20,
    outs: 9,
    discountedOuts: 9,
    note: "The nut-flush draw keeps all nine outs. Eighteen percent turn equity is slightly under the direct 20% price, but a fold-proof opponent with stack behind supplies enough realistic payoff to call."
  }
];

const state = {
  mode: "step",
  handIndex: 0,
  handOrder: [],
  handOrderCursor: 0,
  stepIndex: 0,
  wholeAnswers: {},
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
  if (state.handOrderCursor >= state.handOrder.length) {
    state.handOrder = shuffledHandIndexes(state.handIndex);
    state.handOrderCursor = 0;
  }

  const nextIndex = state.handOrder[state.handOrderCursor];
  state.handOrderCursor += 1;
  return nextIndex;
}

function shuffledHandIndexes(excludedIndex = null) {
  const indexes = hands.map((_, index) => index).filter((index) => index !== excludedIndex);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }

  return indexes.length ? indexes : hands.map((_, index) => index);
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

function effectiveStackBehindAfterCall(hand) {
  return Math.max(0, Math.min(hand.heroStack - hand.call, hand.opponentStack));
}

function futurePayoffFor(hand) {
  return Math.min(hand.expectedFutureWin, effectiveStackBehindAfterCall(hand));
}

function impliedOddsFor(hand) {
  return Math.round((hand.call / (hand.pot + hand.call + futurePayoffFor(hand))) * 100);
}

function shouldCallFor(hand) {
  return drawEquityFor(hand) >= impliedOddsFor(hand);
}

function render() {
  const hand = currentHand();
  elements.stepMode.classList.toggle("active", state.mode === "step");
  elements.wholeMode.classList.toggle("active", state.mode === "whole");
  elements.scenarioTitle.textContent = hand.title;
  elements.scenarioFacts.innerHTML = factsFor(hand)
    .map(({ label, value }) => `<div class="fact"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  if (state.mode === "step") {
    renderStepMode(hand);
  } else {
    renderWholeMode(hand);
  }
}

function factsFor(hand) {
  return [
    { label: "Hero", value: hand.hero },
    { label: "Board", value: hand.board },
    { label: "Street", value: hand.street },
    { label: "Action", value: hand.action },
    { label: "Pot start", value: `$${hand.potStart}` },
    { label: "Street bets", value: `Hero $${hand.heroBetThisStreet} / Villain $${hand.opponentBetThisStreet}` },
    { label: "Price", value: `$${hand.call} to win $${hand.pot}` },
    { label: "Final pot", value: `$${hand.pot + hand.call}` },
    { label: "Stacks", value: `Hero $${hand.heroStack} / Villain $${hand.opponentStack}` },
    { label: "Effective behind", value: `$${effectiveStackBehindAfterCall(hand)} after call` },
    { label: "Future payoff", value: `$${futurePayoffFor(hand)} style-adjusted` },
    { label: "Opponent", value: hand.opponent }
  ];
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
    <input id="potOddsInput" name="potOdds" type="number" min="0" step="1" inputmode="numeric" placeholder="Direct price %" aria-label="Direct pot odds percent" required />
    <input id="impliedOddsInput" name="impliedOdds" type="number" min="0" step="1" inputmode="numeric" placeholder="Implied break-even %" aria-label="Implied odds break-even percent" required />
    ${decisionChoices("wholeDecision")}
  `;
  state.selectedDecision = "";
  state.stepAwaitingNext = false;
  elements.submitButton.textContent = "Check";
  setAnswerControlsDisabled(false);
  elements.feedback.className = "feedback";
  elements.feedback.innerHTML = `<strong>Rapid-fire:</strong> Fill all six answers, then check the hand once.`;
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

  const header = allCorrect ? "Perfect hand." : `${correctCount}/5 close enough.`;
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
  if (step.key === "impliedOdds") {
    return `$${hand.call} / ($${hand.pot} + $${hand.call} + $${futurePayoffFor(hand)} stack-and-style payoff) ≈ ${expected}%.`;
  }
  if (step.key === "decision") {
    return `${drawEquityFor(hand)}% discounted-out equity vs ${impliedOddsFor(hand)}% implied break-even price. ${hand.note}`;
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

state.handOrder = shuffledHandIndexes();
resetHand(nextHandIndex());
