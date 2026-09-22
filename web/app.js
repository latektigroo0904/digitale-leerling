(() => {
  const BASE = {
    "ik": "woord waarmee iemand naar zichzelf verwijst",
    "ben": "vorm van zijn: ik ben",
    "kan": "iets kunnen of in staat zijn iets te doen",
    "wil": "iets wensen of van plan zijn"
  };

  const state = {
    memory: JSON.parse(localStorage.getItem("dl.memory") || "{}"),
    pendingWord: localStorage.getItem("dl.pendingWord") || null,
    awaitingDefinition: localStorage.getItem("dl.awaitingDefinition") === "1"
  };

  const messages = document.getElementById("messages");
  const input = document.getElementById("input");
  const composer = document.getElementById("composer");
  const micBtn = document.getElementById("micBtn");
  const memoryBtn = document.getElementById("memoryBtn");
  const memoryDialog = document.getElementById("memoryDialog");
  const memoryList = document.getElementById("memoryList");
  const closeMemory = document.getElementById("closeMemory");
  const resetBtn = document.getElementById("resetBtn");
  const app = document.getElementById("app");

  const known = () => ({ ...BASE, ...state.memory });

  function save() {
    localStorage.setItem("dl.memory", JSON.stringify(state.memory));
    if (state.pendingWord) localStorage.setItem("dl.pendingWord", state.pendingWord);
    else localStorage.removeItem("dl.pendingWord");
    localStorage.setItem("dl.awaitingDefinition", state.awaitingDefinition ? "1" : "0");
  }

  function normalizeWords(text) {
    return (text.toLowerCase().match(/[a-zA-ZÀ-ÿ0-9'-]+/g) || [])
      .map(word => word.replace(/^'+|'+$/g, ""))
      .filter(Boolean);
  }

  function addMessage(text, who) {
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    div.textContent = text;
    messages.appendChild(div);
    requestAnimationFrame(scrollToBottom);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "nl-BE";
      utterance.rate = 0.98;
      speechSynthesis.speak(utterance);
    } catch {}
  }

  function bot(text, aloud = true) {
    addMessage(text, "bot");
    if (aloud) speak(text);
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function firstUnknown(text) {
    const dict = known();
    return normalizeWords(text).find(word => !dict[word]);
  }

  function learnDefinition(word, definition) {
    state.memory[word] = definition.trim();
    state.pendingWord = null;
    state.awaitingDefinition = false;
    save();
    bot(`Oké. Ik heb geleerd dat "${word}" betekent: ${definition.trim()}`);
  }

  function respond(text) {
    const clean = text.trim();
    if (!clean) return;

    if (state.awaitingDefinition && state.pendingWord) {
      learnDefinition(state.pendingWord, clean);
      return;
    }

    const unknown = firstUnknown(clean);
    if (unknown) {
      state.pendingWord = unknown;
      state.awaitingDefinition = true;
      save();
      bot(`Ik ken het woord "${unknown}" nog niet. Wat betekent "${unknown}"?`);
      return;
    }

    const words = normalizeWords(clean);
    if (words.length === 1) {
      bot(`"${words[0]}" betekent voor mij: ${known()[words[0]]}`);
      return;
    }

    bot("Ik ken alle woorden in die zin. In deze eerste versie leer ik nog geen volledige grammatica. Dat bouwen we als volgende leerlaag.");
  }

  composer.addEventListener("submit", event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    input.style.height = "44px";
    respond(text);
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 130) + "px";
    scrollToBottom();
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  if (window.visualViewport) {
    const fitViewport = () => {
      app.style.height = `${window.visualViewport.height}px`;
      requestAnimationFrame(scrollToBottom);
    };
    window.visualViewport.addEventListener("resize", fitViewport);
    window.visualViewport.addEventListener("scroll", fitViewport);
    fitViewport();
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "nl-BE";
    recognition.interimResults = false;
    recognition.continuous = false;

    micBtn.addEventListener("click", () => {
      try {
        recognition.start();
        micBtn.classList.add("listening");
      } catch {}
    });

    recognition.addEventListener("result", event => {
      input.value = event.results[0][0].transcript;
      input.dispatchEvent(new Event("input"));
      composer.requestSubmit();
    });
    recognition.addEventListener("end", () => micBtn.classList.remove("listening"));
    recognition.addEventListener("error", () => micBtn.classList.remove("listening"));
  } else {
    micBtn.disabled = true;
    micBtn.title = "Spraakherkenning wordt in deze browser niet ondersteund.";
  }

  memoryBtn.addEventListener("click", () => {
    memoryList.innerHTML = "";
    for (const [word, definition] of Object.entries(known()).sort(([a], [b]) => a.localeCompare(b))) {
      const row = document.createElement("div");
      row.className = "memory-row";
      const title = document.createElement("b");
      title.textContent = word;
      const body = document.createElement("span");
      body.textContent = definition;
      row.append(title, body);
      memoryList.appendChild(row);
    }
    memoryDialog.showModal();
  });

  closeMemory.addEventListener("click", () => memoryDialog.close());
  resetBtn.addEventListener("click", () => {
    if (!confirm("Alle woorden die jij hebt aangeleerd wissen?")) return;
    state.memory = {};
    state.pendingWord = null;
    state.awaitingDefinition = false;
    save();
    memoryDialog.close();
    bot("Mijn aangeleerde geheugen is gewist. Ik ken opnieuw alleen mijn vier basiswoorden.");
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  bot('Eywa Q. Ik begin klein. Ik ken nu alleen "ik", "ben", "kan" en "wil". Leer mij iets.', false);
})();
