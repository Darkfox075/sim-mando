const TEST_SIZE = 20;
const TEST_SECONDS = 10 * 60;
const PASS_PERCENT = 60;
const STORAGE_KEY = "simulador_prueba_rapida_v3";
const NAME_STORAGE_KEY = "simulador_prueba_rapida_nombre";

// La funcionalidad del simulador usa el banco cargado desde question-bank.js.
const questionBank = window.QUESTION_BANK;

if (!Array.isArray(questionBank) || questionBank.length < TEST_SIZE) {
  throw new Error("El banco de preguntas no esta cargado o tiene menos preguntas que las requeridas.");
}

const els = {
  startScreen: document.querySelector("#startScreen"),
  testScreen: document.querySelector("#testScreen"),
  resultsScreen: document.querySelector("#resultsScreen"),
  nameInput: document.querySelector("#nameInput"),
  startBtn: document.querySelector("#startBtn"),
  timer: document.querySelector("#timer"),
  timerBox: document.querySelector(".timer-box"),
  progressText: document.querySelector("#progressText"),
  questionPosition: document.querySelector("#questionPosition"),
  progressBar: document.querySelector("#progressBar"),
  questionBoard: document.querySelector("#questionBoard"),
  sourceQuestion: document.querySelector("#sourceQuestion"),
  markBtn: document.querySelector("#markBtn"),
  questionText: document.querySelector("#questionText"),
  optionsList: document.querySelector("#optionsList"),
  prevBtn: document.querySelector("#prevBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  gradeBtn: document.querySelector("#gradeBtn"),
  restartBtn: document.querySelector("#restartBtn"),
  timeoutNotice: document.querySelector("#timeoutNotice"),
  resultStatus: document.querySelector("#resultStatus"),
  scoreText: document.querySelector("#scoreText"),
  percentText: document.querySelector("#percentText"),
  gradeText: document.querySelector("#gradeText"),
  usedTimeText: document.querySelector("#usedTimeText"),
  showAllBtn: document.querySelector("#showAllBtn"),
  showWrongBtn: document.querySelector("#showWrongBtn"),
  newTestBtn: document.querySelector("#newTestBtn"),
  reviewList: document.querySelector("#reviewList")
};

let state = null;
let timerId = null;
let reviewFilter = "all";

function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createAttempt(participantName = "") {
  const random = Math.random;
  const selected = shuffle(questionBank, random).slice(0, TEST_SIZE).map((question) => ({
    ...question,
    shuffledOptions: shuffle(question.options, random)
  }));

  return {
    questions: selected,
    answers: Array(TEST_SIZE).fill(null),
    marked: Array(TEST_SIZE).fill(false),
    currentIndex: 0,
    remainingSeconds: TEST_SECONDS,
    startedAt: Date.now(),
    graded: false,
    timedOut: false,
    participantName
  };
}

function saveState() {
  if (!state || state.graded) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.graded || !Array.isArray(saved.questions)) return null;
    return saved;
  } catch {
    return null;
  }
}

function showScreen(name) {
  els.startScreen.classList.toggle("hidden", name !== "start");
  els.testScreen.classList.toggle("hidden", name !== "test");
  els.resultsScreen.classList.toggle("hidden", name !== "results");
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function estimateGrade(percent) {
  const grade = percent < 60
    ? 1 + (percent / 60) * 3
    : 4 + ((percent - 60) / 40) * 3;
  return Math.max(1, Math.min(7, grade)).toFixed(1);
}

function answeredCount() {
  return state.answers.filter(Boolean).length;
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    if (!state || state.graded) return;
    state.remainingSeconds -= 1;
    if (state.remainingSeconds <= 0) {
      state.remainingSeconds = 0;
      gradeTest(true);
      return;
    }
    renderTimer();
    saveState();
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function renderTimer() {
  els.timer.textContent = formatTime(state.remainingSeconds);
  els.timerBox.classList.toggle("warning", state.remainingSeconds <= 300 && state.remainingSeconds > 60);
  els.timerBox.classList.toggle("danger", state.remainingSeconds <= 60);
}

function renderBoard() {
  els.questionBoard.innerHTML = "";
  state.questions.forEach((_, index) => {
    const button = document.createElement("button");
    button.className = "board-btn";
    button.type = "button";
    button.textContent = index + 1;
    button.setAttribute("aria-label", `Ir a la pregunta ${index + 1}`);
    button.classList.toggle("current", index === state.currentIndex);
    button.classList.toggle("answered", Boolean(state.answers[index]));
    button.classList.toggle("marked", Boolean(state.marked[index]));
    button.addEventListener("click", () => {
      state.currentIndex = index;
      renderTest();
      saveState();
    });
    els.questionBoard.appendChild(button);
  });
}

function renderProgress() {
  const count = answeredCount();
  els.progressText.textContent = `${count} de ${TEST_SIZE} respondidas`;
  els.questionPosition.textContent = `Pregunta ${state.currentIndex + 1} de ${TEST_SIZE}`;
  els.progressBar.style.width = `${(count / TEST_SIZE) * 100}%`;
}

function renderQuestion() {
  const item = state.questions[state.currentIndex];
  els.sourceQuestion.textContent = `Pregunta del banco ${item.id}`;
  els.questionText.textContent = item.question;
  els.optionsList.innerHTML = "";

  item.shuffledOptions.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.textContent = option;
    button.disabled = state.graded;
    button.classList.toggle("selected", state.answers[state.currentIndex] === option);

    if (state.graded) {
      button.classList.toggle("correct", option === item.answer);
      button.classList.toggle("incorrect", state.answers[state.currentIndex] === option && option !== item.answer);
    }

    button.addEventListener("click", () => {
      if (state.graded) return;
      state.answers[state.currentIndex] = option;
      renderTest();
      saveState();
    });

    els.optionsList.appendChild(button);
  });

  els.markBtn.textContent = state.marked[state.currentIndex] ? "Quitar marca" : "Marcar para revisar";
  els.prevBtn.disabled = state.currentIndex === 0;
  els.nextBtn.disabled = state.currentIndex === TEST_SIZE - 1;
  els.gradeBtn.classList.toggle("hidden", state.currentIndex !== TEST_SIZE - 1);
  els.restartBtn.classList.toggle("hidden", state.currentIndex !== TEST_SIZE - 1);
  els.gradeBtn.disabled = state.graded;
}

function renderTest() {
  if (!state) return;
  showScreen("test");
  renderTimer();
  renderProgress();
  renderBoard();
  renderQuestion();
}

function startNewAttempt() {
  const participantName = els.nameInput.value.trim() || "Estudiante";
  localStorage.setItem(NAME_STORAGE_KEY, participantName);
  state = createAttempt(participantName);
  clearSavedState();
  renderTest();
  startTimer();
  saveState();
}

function requestRestart() {
  if (!state) {
    startNewAttempt();
    return;
  }

  const hasProgress = answeredCount() > 0 || state.marked.some(Boolean);
  if (hasProgress && !window.confirm("Se borrará el intento actual. ¿Quieres rehacer la prueba?")) return;
  stopTimer();
  startNewAttempt();
}

function gradeTest(timedOut = false) {
  if (!state || state.graded) return;

  const unanswered = state.answers.filter((answer) => !answer).length;
  if (!timedOut && unanswered > 0) {
    const ok = window.confirm(`Tienes ${unanswered} preguntas sin responder. ¿Quieres calificar de todas formas?`);
    if (!ok) return;
  }

  state.graded = true;
  state.timedOut = timedOut;
  stopTimer();
  clearSavedState();
  renderResults();
}

function scoreAttempt() {
  const correct = state.questions.reduce((total, item, index) => total + (state.answers[index] === item.answer ? 1 : 0), 0);
  const unanswered = state.answers.filter((answer) => !answer).length;
  const incorrect = TEST_SIZE - correct - unanswered;
  const percent = Math.round((correct / TEST_SIZE) * 100);
  return { correct, incorrect, unanswered, percent };
}

function renderResults() {
  showScreen("results");
  const score = scoreAttempt();
  const passed = score.percent >= PASS_PERCENT;
  const usedSeconds = TEST_SECONDS - state.remainingSeconds;
  const participantName = state.participantName || "Estudiante";

  els.timeoutNotice.classList.toggle("hidden", !state.timedOut);
  els.timeoutNotice.textContent = `${participantName}, el tiempo terminó. La prueba fue calificada automáticamente.`;
  els.resultStatus.textContent = `${participantName}, resultado: ${passed ? "Aprobado" : "Reprobado"}`;
  els.resultStatus.style.color = passed ? "var(--green)" : "var(--red)";
  els.scoreText.textContent = `${score.correct}/${TEST_SIZE}`;
  els.percentText.textContent = `${score.percent}%`;
  els.gradeText.textContent = estimateGrade(score.percent);
  els.usedTimeText.textContent = formatTime(usedSeconds);

  renderReviewList();
}

function renderReviewList() {
  els.reviewList.innerHTML = "";
  state.questions.forEach((item, index) => {
    const userAnswer = state.answers[index];
    const isCorrect = userAnswer === item.answer;
    const isUnanswered = !userAnswer;

    if (reviewFilter === "wrong" && isCorrect) return;

    const article = document.createElement("article");
    article.className = "review-item";
    article.classList.toggle("wrong", !isCorrect && !isUnanswered);
    article.classList.toggle("unanswered", isUnanswered);

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${item.question}`;

    const status = document.createElement("p");
    status.innerHTML = `<strong>Estado:</strong> ${isCorrect ? "Correcta" : isUnanswered ? "Sin responder" : "Incorrecta"}`;

    const selected = document.createElement("p");
    selected.innerHTML = `<strong>Tu respuesta:</strong> ${userAnswer || "No respondida"}`;

    const correct = document.createElement("p");
    correct.innerHTML = `<strong>Respuesta correcta:</strong> ${item.answer}`;

    article.append(title, status, selected, correct);
    els.reviewList.appendChild(article);
  });
}

function setReviewFilter(filter) {
  reviewFilter = filter;
  els.showAllBtn.classList.toggle("active-filter", filter === "all");
  els.showWrongBtn.classList.toggle("active-filter", filter === "wrong");
  renderReviewList();
}

els.startBtn.addEventListener("click", startNewAttempt);
els.prevBtn.addEventListener("click", () => {
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  renderTest();
  saveState();
});
els.nextBtn.addEventListener("click", () => {
  state.currentIndex = Math.min(TEST_SIZE - 1, state.currentIndex + 1);
  renderTest();
  saveState();
});
els.markBtn.addEventListener("click", () => {
  state.marked[state.currentIndex] = !state.marked[state.currentIndex];
  renderTest();
  saveState();
});
els.gradeBtn.addEventListener("click", () => gradeTest(false));
els.restartBtn.addEventListener("click", requestRestart);
els.newTestBtn.addEventListener("click", () => {
  showScreen("start");
  state = null;
  reviewFilter = "all";
});
els.showAllBtn.addEventListener("click", () => setReviewFilter("all"));
els.showWrongBtn.addEventListener("click", () => setReviewFilter("wrong"));

window.addEventListener("beforeunload", (event) => {
  if (!state || state.graded || answeredCount() === 0) return;
  event.preventDefault();
  event.returnValue = "";
});

els.nameInput.value = localStorage.getItem(NAME_STORAGE_KEY) || "";

