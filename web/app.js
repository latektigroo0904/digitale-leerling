(() => {
  const BASE = {
    "ik": "woord waarmee iemand naar zichzelf verwijst",
    "ben": "vorm van zijn: ik ben",
    "kan": "iets kunnen of in staat zijn iets te doen",
    "wil": "iets wensen of van plan zijn"
  };

  const state = {
    memory: {},
    pendingWord: null,
    awaitingDefinition: false,
    storageReady: false
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

  async function persistConversationState() {
    if (!state.storageReady) return;
    await window.DLDB.setConversationState({
      pendingWord: state.pendingWord,
      awaitingDefinition: state.awaitingDefinition
    });
  }

  async function learnDefinition(word, definition) {
    const cleanDefinition = definition.trim();

    if (state.storageReady) {
      await window.DLDB.putWord(word, cleanDefinition);
    }

    state.memory[word] = cleanDefinition;
    state.pendingWord = null;
    state.awaitingDefinition = false;
    await persistConversationState();

    bot(`Oké. Ik heb geleerd dat "${word}" betekent: ${cleanDefinition}`);
  }

  async function respond(text) {
    const clean = text.trim();
    if (!clean) return;

    if (state.awaitingDefinition && state.pendingWord) {
      await learnDefinition(state.pendingWord, clean);
      return;
    }

    const unknown = firstUnknown(clean);
    if (unknown) {
      state.pendingWord = unknown;
      state.awaitingDefinition = true;
      await persistConversationState();
      bot(`Ik ken het woord "${unknown}" nog niet. Wat betekent "${unknown}"?`);
      return;
    }

    const words = normalizeWords(clean);
    if (words.length === 1) {
      bot(`"${words[0]}" betekent voor mij: ${known()[words[0]]}`);
      return;
    }

    bot("Ik ken alle woorden in die zin. In deze versie leer ik nog geen volledige grammatica. Dat bouwen we als volgende leerlaag.");
  }

  composer.addEventListener("submit", async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    input.style.height = "44px";

    try {
      await respond(text);
    } catch (error) {
      console.error(error);
      bot("Er ging iets mis bij het bewaren. Probeer het nog eens.", false);
    }
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

  memoryBtn.addEventListener("click", async () => {
    if (state.storageReady) {
      state.memory = await window.DLDB.getWordsMap();
    }

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

  resetBtn.addEventListener("click", async () => {
    if (!confirm("Alle woorden die jij hebt aangeleerd wissen?")) return;

    try {
      if (state.storageReady) {
        await window.DLDB.clearLearnedMemory();
      }

      state.memory = {};
      state.pendingWord = null;
      state.awaitingDefinition = false;
      memoryDialog.close();
      bot("Mijn aangeleerde geheugen is gewist. Ik ken opnieuw alleen mijn vier basiswoorden.");
    } catch (error) {
      console.error(error);
      bot("Ik kon mijn geheugen niet wissen.", false);
    }
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  async function start() {
    composer.querySelectorAll("button, textarea").forEach(element => {
      element.disabled = true;
    });

    try {
      await window.DLDB.init();
      state.memory = await window.DLDB.getWordsMap();

      const conversation = await window.DLDB.getConversationState();
      state.pendingWord = conversation.pendingWord;
      state.awaitingDefinition = conversation.awaitingDefinition;
      state.storageReady = true;

      bot('Eywa Q. Mijn geheugen gebruikt nu IndexedDB. Ik ken standaard "ik", "ben", "kan" en "wil". Leer mij iets.', false);

      if (state.awaitingDefinition && state.pendingWord) {
        bot(`We waren bezig met het woord "${state.pendingWord}". Wat betekent "${state.pendingWord}"?`, false);
      }
    } catch (error) {
      console.error("IndexedDB kon niet worden gestart:", error);
      bot("Mijn permanente geheugen kon niet worden geopend. Ik kan nu wel praten, maar nieuwe kennis blijft mogelijk niet bewaard.", false);
    } finally {
      composer.querySelectorAll("button, textarea").forEach(element => {
        element.disabled = false;
      });
      input.focus({ preventScroll: true });
    }
  }

  start();
})();
