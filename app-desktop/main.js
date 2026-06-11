const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let janela;
let processoNode;
let processoPython;
let processoPainel;

function criarJanela() {
  janela = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Carmem Carvalho IA",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  janela.loadURL("http://localhost:5173");

  let podeFechar = false;

  janela.on("close", (event) => {
    if (podeFechar) return;

    const escolha = dialog.showMessageBoxSync(janela, {
      type: "question",
      buttons: ["Cancelar", "Encerrar sistema"],
      defaultId: 0,
      cancelId: 0,
      title: "Encerrar sistema",
      message: "Tem certeza que deseja encerrar o sistema?",
      detail: "O bot do WhatsApp, a IA e o painel serão fechados com segurança."
    });

    if (escolha === 0) {
      event.preventDefault();
      return;
    }

    podeFechar = true;
    encerrarServidores();
  });
}

function iniciarServidores() {
  const pastaProjeto = path.join(__dirname, "..");

  processoPython = spawn("python", ["backend-python/ia_server.py"], {
    cwd: path.join(pastaProjeto, "backend-python"),
    shell: true,
  });

  processoNode = spawn("node", ["index.js"], {
    cwd: path.join(pastaProjeto, "whatsapp-bot"),
    shell: true,
  });

  processoPainel = spawn("npm", ["run", "dev"], {
    cwd: path.join(pastaProjeto, "whatsapp-painel"),
    shell: true,
  });

  processoPython.stdout.on("data", (data) => {
    console.log(`[PYTHON] ${data}`);
  });

  processoPython.stderr.on("data", (data) => {
    console.error(`[PYTHON ERRO] ${data}`);
  });

  processoNode.stdout.on("data", (data) => {
    console.log(`[NODE] ${data}`);
  });

  processoNode.stderr.on("data", (data) => {
    console.error(`[NODE ERRO] ${data}`);
  });

  processoPainel.stdout.on("data", (data) => {
    console.log(`[PAINEL] ${data}`);
  });

  processoPainel.stderr.on("data", (data) => {
    console.error(`[PAINEL ERRO] ${data}`);
  });
}

function matarProcesso(processo) {
  if (!processo || !processo.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", processo.pid, "/f", "/t"]);
  } else {
    processo.kill("SIGTERM");
  }
}

function encerrarServidores() {
  matarProcesso(processoPython);
  matarProcesso(processoNode);
  matarProcesso(processoPainel);
}

app.whenReady().then(() => {
  iniciarServidores();

  setTimeout(() => {
    criarJanela();
  }, 7000);
});

app.on("window-all-closed", () => {
  encerrarServidores();

  if (process.platform !== "darwin") {
    app.quit();
  }
});