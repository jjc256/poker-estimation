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
    key: "potOdds",
    label: "Estimate the pot odds you need to call.",
    suffix: "%",
    tolerance: 2,
    answer: (hand) => hand.potOdds,
    hint: "Call divided by final pot after you call."
  },
  {
    key: "impliedOdds",
    label: "Estimate your implied equity after opponent style.",
    suffix: "%",
    tolerance: 3,
    answer: (hand) => hand.impliedOdds,
    hint: "Tighter opponents pay less when obvious draws arrive; loose opponents pay more."
  },
  {
    key: "decision",
    label: "Should you call?",
    suffix: "",
    tolerance: 0,
    answer: (hand) => hand.shouldCall ? "call" : "fold",
    hint: "Call when your implied equity is at least the price."
  }
];

const hands = [
  {
    title: "Turn flush draw vs sticky caller",
    hero: "A♠ 9♠",
    board: "K♠ 7♠ 2♦ Q♥",
    pot: 90,
    call: 30,
    street: "Turn",
    opponent: "Loose-passive: pays off one-pair hands too often",
    outs: 9,
    discountedOuts: 8,
    potOdds: 25,
    impliedOdds: 22,
    shouldCall: false,
    note: "The flush draw is close, but one dirty spade and only one card to come make the price slightly too high."
  },
  {
    title: "Flop open-ender with deep stacks",
    hero: "J♥ T♥",
    board: "9♣ 8♦ 2♠",
    pot: 60,
    call: 15,
    street: "Flop",
    opponent: "Aggressive regular: barrels often but can fold scary rivers",
    outs: 8,
    discountedOuts: 7,
    potOdds: 20,
    impliedOdds: 29,
    shouldCall: true,
    note: "Two cards to come and deep stacks make the discounted straight draw profitable."
  },
  {
    title: "Dominated overcards on a wet flop",
    hero: "A♦ Q♣",
    board: "J♠ 8♠ 3♥",
    pot: 70,
    call: 35,
    street: "Flop",
    opponent: "Tight value bettor: strong range, rarely pays missed top pair",
    outs: 6,
    discountedOuts: 3,
    potOdds: 33,
    impliedOdds: 12,
    shouldCall: false,
    note: "The raw overcard count is misleading because top pair can still be dominated."
  },
  {
    title: "Combo draw against a station",
    hero: "Q♣ J♣",
    board: "T♣ 9♣ 4♦",
    pot: 120,
    call: 40,
    street: "Flop",
    opponent: "Calling station: hates folding made hands",
    outs: 15,
    discountedOuts: 13,
    potOdds: 25,
    impliedOdds: 54,
    shouldCall: true,
    note: "Even after discounting overlap and dirty cards, the combo draw crushes the price."
  },
  {
    title: "Gutshot with bad implied odds",
    hero: "7♦ 6♦",
    board: "A♣ 5♠ 4♥ K♠",
    pot: 100,
    call: 45,
    street: "Turn",
    opponent: "Nit: folds when the obvious straight completes",
    outs: 4,
    discountedOuts: 3,
    potOdds: 31,
    impliedOdds: 8,
    shouldCall: false,
    note: "A small turn draw needs a cheap price or a player who will pay when you hit."
  },
  {
    title: "Nut-flush draw with fold-proof villain",
    hero: "A♥ 5♥",
    board: "K♥ 8♥ 6♣ 2♠",
    pot: 80,
    call: 20,
    street: "Turn",
    opponent: "Splashy whale: overcalls rivers with any king",
    outs: 9,
    discountedOuts: 9,
    potOdds: 20,
    impliedOdds: 24,
    shouldCall: true,
    note: "The direct price is close, and the opponent's payoff tendency pushes it into a call."
  }
];

const state = {
  mode: "step",
  handIndex: 0,
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
  return (state.handIndex + 1) % hands.length;
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
    { label: "Price", value: `$${hand.call} to win $${hand.pot}` },
    { label: "Final pot", value: `$${hand.pot + hand.call}` },
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
    <input id="potOddsInput" name="potOdds" type="number" min="0" step="1" inputmode="numeric" placeholder="Pot odds %" aria-label="Pot odds percent" required />
    <input id="impliedOddsInput" name="impliedOdds" type="number" min="0" step="1" inputmode="numeric" placeholder="Implied equity %" aria-label="Implied equity percent" required />
    ${decisionChoices("wholeDecision")}
  `;
  state.selectedDecision = "";
  state.stepAwaitingNext = false;
  elements.submitButton.textContent = "Check";
  setAnswerControlsDisabled(false);
  elements.feedback.className = "feedback";
  elements.feedback.innerHTML = `<strong>Rapid-fire:</strong> Fill all five answers, then check the hand once.`;
  focusFirstInput();
}

function labelForPill(key) {
  return {
    outs: "Outs",
    discountedOuts: "Discount",
    potOdds: "Pot odds",
    impliedOdds: "Implied",
    decision: "Call?"
  }[key];
}

function inputFor(key, label) {
  if (key === "decision") {
    return decisionChoices("stepDecision");
  }

  const placeholder = key.includes("Odds") ? "%" : "outs";
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
  if (step.key === "potOdds") {
    return `$${hand.call} / ($${hand.pot} + $${hand.call}) ≈ ${expected}%.`;
  }
  if (step.key === "decision") {
    return `${hand.impliedOdds}% implied equity vs ${hand.potOdds}% pot odds. ${hand.note}`;
  }
  if (step.key === "impliedOdds") {
    return `Opponent style adjusts the draw to roughly ${expected}%.`;
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

resetHand(0);
