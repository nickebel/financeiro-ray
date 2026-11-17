(() => {
  const installButton = document.getElementById("installAppBtn");
  const help = document.getElementById("installHelp");
  if (!installButton) return;
  let deferredPrompt = null;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const nativeShell = document.querySelector('meta[name="mf-native-shell"]')?.content === "true" || location.protocol === "financeapp:" || location.protocol === "capacitor:" || (location.hostname === "localhost" && !!window.Capacitor);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (standalone || nativeShell) installButton.hidden = true;
  if (isIOS && !standalone && !nativeShell) {
    installButton.textContent = "Como adicionar";
    installButton.title = "Adicionar o Ray à Tela de Início";
    installButton.setAttribute("aria-label", "Como adicionar o Ray à Tela de Início");
    if (help) help.textContent = "No Safari do iPhone, toque em Compartilhar, escolha “Adicionar à Tela de Início” e confirme em “Adicionar”.";
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
    installButton.textContent = isIOS ? "Como adicionar" : "Instalar app ↗";
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installButton.hidden = true;
    if (help) help.classList.add("hidden");
  });

  installButton.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === "accepted") {
        installButton.hidden = true;
        if (help) help.classList.add("hidden");
      } else if (help) {
        help.classList.remove("hidden");
      }
      return;
    }
    if (help) help.classList.toggle("hidden");
  });

  if (!nativeShell && "serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(new URL("sw.js", document.baseURI), { scope: new URL("./", document.baseURI).pathname })
        .catch(error => console.warn("Não foi possível registrar o aplicativo:", error));
    });
  }
})();
