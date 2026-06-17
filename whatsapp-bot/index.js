const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const NUMERO_HUMANO = "5543920005386@s.whatsapp.net";
const TEMPO_PAUSA_HUMANO = 30 * 60 * 1000; // 30 minutos
const LIMITE_MEMORIA = 10;
const LIMITE_CONVERSA_ATIVA = 24 * 60 * 60 * 1000; // 24h
const ENVIANDO_IA = new Set();

let IA_ATIVA = true;
let WHATSAPP_CONECTADO = false;
let QR_CODE_BASE64 = null;
let sockAtual = null;
let reiniciandoWhatsApp = false;
let mensagensHoje = 0;

const clientesPausados = {};
const conversas = {};
const clientes = {};
const conversasPainel = {};

const PASTA_DADOS = path.join(__dirname, "dados");
const ARQUIVO_CLIENTES = path.join(PASTA_DADOS, "clientes.json");
const ARQUIVO_PAUSADOS = path.join(PASTA_DADOS, "pausados.json");
const ARQUIVO_CONVERSAS_PAINEL = path.join(PASTA_DADOS, "conversas-painel.json");

app.get("/status", (req, res) => {
    res.json({
        ia_ativa: IA_ATIVA,
        whatsapp_conectado: WHATSAPP_CONECTADO,
        clientes_pausados: Object.keys(clientesPausados).length,
        clientes_conhecidos: Object.keys(clientes).length,
        mensagens_hoje: mensagensHoje,
        qr_code: QR_CODE_BASE64,
        clientes_pausados_lista: Object.keys(clientesPausados).map((numeroCliente) => ({
            numero: numeroCliente,
            nome: obterNomeCliente(numeroCliente),
            pausado_ate: clientesPausados[numeroCliente]
        })),

        conversas_ativas: Object.values(conversasPainel)
            .filter((conversa) =>
                Date.now() - conversa.atualizado_em < LIMITE_CONVERSA_ATIVA
            )
            .filter((cliente) => !clienteEstaPausado(cliente.numero))
            .sort((a, b) => b.atualizado_em - a.atualizado_em)
            .slice(0, 20),

        ultimas_conversas: Object.values(conversasPainel)
            .sort((a, b) => b.atualizado_em - a.atualizado_em)
            .slice(0, 20),

    });
});

app.post("/ia/ligar", (req, res) => {
    IA_ATIVA = true;

    res.json({
        sucesso: true,
        mensagem: "IA ligada",
        ia_ativa: IA_ATIVA
    });
});

app.post("/ia/desligar", (req, res) => {
    IA_ATIVA = false;

    res.json({
        sucesso: true,
        mensagem: "IA desligada",
        ia_ativa: IA_ATIVA
    });
});

app.post("/whatsapp/reiniciar", async (req, res) => {
    try {
        reiniciandoWhatsApp = true;

        if (sockAtual) {
            try {
                sockAtual.end();
            } catch (e) {
                console.log("Conexão anterior já estava encerrada.");
            }

            sockAtual = null;
        }

        fs.rmSync("auth", { recursive: true, force: true });

        WHATSAPP_CONECTADO = false;
        QR_CODE_BASE64 = null;

        setTimeout(() => {
            reiniciandoWhatsApp = false;
            startBot();
        }, 1000);

        res.json({
            sucesso: true,
            mensagem: "WhatsApp reiniciado. Aguarde o novo QR Code."
        });

    } catch (error) {
        reiniciandoWhatsApp = false;

        res.status(500).json({
            sucesso: false,
            erro: error.message
        });
    }
});

app.post("/cliente/reativar", (req, res) => {
    const { numeroCliente } = req.body;

    if (!numeroCliente) {
        return res.status(400).json({
            sucesso: false,
            erro: "Número do cliente não informado."
        });
    }

    delete clientesPausados[numeroCliente];

    if (conversasPainel[numeroCliente]) {
        conversasPainel[numeroCliente].pausado = false;
        conversasPainel[numeroCliente].nova_mensagem = false;
        conversasPainel[numeroCliente].origem = "humano";
        conversasPainel[numeroCliente].ultima_resposta_ia =
            conversasPainel[numeroCliente].ultima_resposta_ia ||
            "IA reativada para este cliente.";
    }

    salvarDados();

    res.json({
        sucesso: true,
        mensagem: "IA reativada para o cliente."
    });
});

app.post("/cliente/:numero/pausar", (req, res) => {
    const numeroCliente = decodeURIComponent(req.params.numero);

    pausarCliente(numeroCliente);

    res.json({
        sucesso: true
    });
});

app.post("/sistema/encerrar", (req, res) => {
    salvarDados();

    res.json({
        sucesso: true,
        mensagem: "Sistema encerrando com segurança."
    });

    setTimeout(() => {
        process.exit(0);
    }, 500);
});

function limparNumero(numeroCliente) {
    return numeroCliente.replace(/@.*/, "");
}

function garantirPastaDados() {
    if (!fs.existsSync(PASTA_DADOS)) {
        fs.mkdirSync(PASTA_DADOS);
    }
}

function lerJSON(caminhoArquivo, valorPadrao) {
    try {
        if (!fs.existsSync(caminhoArquivo)) {
            return valorPadrao;
        }

        const conteudo = fs.readFileSync(caminhoArquivo, "utf-8");
        return JSON.parse(conteudo);
    } catch (error) {
        console.error("Erro ao ler JSON:", caminhoArquivo, error.message);
        return valorPadrao;
    }
}

function salvarJSON(caminhoArquivo, dados) {
    try {
        garantirPastaDados();
        fs.writeFileSync(caminhoArquivo, JSON.stringify(dados, null, 2));
    } catch (error) {
        console.error("Erro ao salvar JSON:", caminhoArquivo, error.message);
    }
}

function carregarDados() {
    Object.assign(clientes, lerJSON(ARQUIVO_CLIENTES, {}));
    Object.assign(clientesPausados, lerJSON(ARQUIVO_PAUSADOS, {}));
    Object.assign(conversasPainel, lerJSON(ARQUIVO_CONVERSAS_PAINEL, {}));

    console.log("Dados carregados com sucesso.");
}

function salvarDados() {
    salvarJSON(ARQUIVO_CLIENTES, clientes);
    salvarJSON(ARQUIVO_PAUSADOS, clientesPausados);
    salvarJSON(ARQUIVO_CONVERSAS_PAINEL, conversasPainel);
}

function salvarNomeCliente(numeroCliente, nomeCliente) {
    if (!nomeCliente) return;

    clientes[numeroCliente] = {
        ...(clientes[numeroCliente] || {}),
        nome: nomeCliente
    };
    salvarDados();
}

function obterNomeCliente(numeroCliente) {
    return clientes[numeroCliente]?.nome || "Não identificado";
}

function clienteEstaPausado(numeroCliente) {
    const pausadoAte = clientesPausados[numeroCliente];

    if (!pausadoAte) return false;

    if (Date.now() > pausadoAte) {
        delete clientesPausados[numeroCliente];
        return false;
    }

    return true;
}

function pausarCliente(numeroCliente) {
    clientesPausados[numeroCliente] = Date.now() + TEMPO_PAUSA_HUMANO;
    salvarDados();
}

function iniciarMemoria(numeroCliente) {
    if (!conversas[numeroCliente]) {
        conversas[numeroCliente] = [];
    }
}

function adicionarNaMemoria(numeroCliente, role, content) {
    iniciarMemoria(numeroCliente);

    conversas[numeroCliente].push({
        role,
        content
    });

    if (conversas[numeroCliente].length > LIMITE_MEMORIA) {
        conversas[numeroCliente].shift();
    }
}

function registrarMensagemPainel(numeroCliente, origem, texto, nomeWhatsapp = "Não identificado") {
    const nomeCliente = obterNomeCliente(numeroCliente);
    const conversaAtual = conversasPainel[numeroCliente] || {};

    conversasPainel[numeroCliente] = {
        numero: numeroCliente,
        nome: nomeCliente !== "Não identificado" ? nomeCliente : nomeWhatsapp,
        ultima_mensagem_cliente:
            origem === "cliente" ? texto : conversaAtual.ultima_mensagem_cliente || "",
        ultima_resposta_ia:
            origem === "ia" || origem === "humano"
                ? texto
                : conversaAtual.ultima_resposta_ia || "",
        origem,
        atualizado_em: Date.now(),
        pausado: clienteEstaPausado(numeroCliente),
        nova_mensagem: origem === "cliente"
    };
    salvarDados();
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state
    });

    sockAtual = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log("\nEscaneie o QR Code:\n");
            qrcode.generate(qr, { small: true });

            QRCode.toDataURL(qr)
                .then((url) => {
                    QR_CODE_BASE64 = url;
                })
                .catch(console.error);
        }

        if (connection === "open") {
            WHATSAPP_CONECTADO = true;
            QR_CODE_BASE64 = null;

            console.log("WhatsApp conectado com sucesso!");
        }

        if (connection === "close") {
            WHATSAPP_CONECTADO = false;

            if (reiniciandoWhatsApp) {
                console.log("WhatsApp reiniciando manualmente...");
                return;
            }

            console.log("Conexão fechada, reiniciando...");
            startBot();
        }
    });

    sock.ev.on("messages.upsert", async (msg) => {
        try {
            const message = msg.messages[0];

            if (!message.message) return;

            const numeroCliente = message.key.remoteJid;

            if (message.key.fromMe) {
                if (ENVIANDO_IA.has(numeroCliente)) {
                    return;
                }

                if (
                    numeroCliente &&
                    numeroCliente !== NUMERO_HUMANO &&
                    numeroCliente !== "status@broadcast" &&
                    !numeroCliente.includes("status")
                ) {
                    pausarCliente(numeroCliente);

                    registrarMensagemPainel(
                        numeroCliente,
                        "humano",
                        "Atendimento manual iniciado. IA pausada por 30 minutos.",
                        "Atendimento humano"
                    );

                    console.log(`IA pausada automaticamente porque humano respondeu ${numeroCliente}`);
                }

                return;
            }

                if (
                    numeroCliente === "status@broadcast" ||
                    numeroCliente?.includes("status")
                ) {
                    return;
                }
            const nomeWhatsapp = message.pushName || "Não identificado";

            const texto = (
                message.message.conversation ||
                message.message.extendedTextMessage?.text ||
                ""
            ).trim();

            if (!texto) return;

            console.log("Cliente:", numeroCliente, texto);
            mensagensHoje++;
            registrarMensagemPainel(numeroCliente, "cliente", texto, nomeWhatsapp);

            if (clienteEstaPausado(numeroCliente)) {
                console.log(`IA pausada para ${numeroCliente}`);
                return;
            }

            if (!IA_ATIVA) {
                console.log("IA desligada no momento.");
                return;
            }

            iniciarMemoria(numeroCliente);

            const historicoAntesDaMensagem = [...conversas[numeroCliente]];

            const nomeConhecido = obterNomeCliente(numeroCliente);

            const response = await axios.post("http://localhost:5000/chat", {
                mensagem: texto,
                historico: historicoAntesDaMensagem,
                nome_cliente_conhecido: nomeConhecido !== "Não identificado" ? nomeConhecido : null
            });

            const resposta = response.data.resposta;
            const transferirHumano = response.data.transferir_humano;
            const motivo = response.data.motivo || "A IA identificou que precisa de atendimento humano.";
            const nomeCliente = response.data.nome_cliente;

            if (nomeCliente) {
                salvarNomeCliente(numeroCliente, nomeCliente);
            }

            ENVIANDO_IA.add(numeroCliente);

            await sock.sendMessage(numeroCliente, { text: resposta });

            setTimeout(() => {
                ENVIANDO_IA.delete(numeroCliente);
            }, 3000);

            registrarMensagemPainel(numeroCliente, "ia", resposta, nomeWhatsapp);
            adicionarNaMemoria(numeroCliente, "user", texto);
            adicionarNaMemoria(numeroCliente, "assistant", resposta);

            if (transferirHumano) {
                pausarCliente(numeroCliente);

                const nomeInformado = obterNomeCliente(numeroCliente);
                const numeroLimpo = limparNumero(numeroCliente);

                const nomeParaAlerta =
                    nomeInformado !== "Não identificado"
                        ? nomeInformado
                        : nomeWhatsapp;

                await sock.sendMessage(NUMERO_HUMANO, {
                    text:
`⚠️ Atendimento humano necessário

Cliente: ${nomeParaAlerta}
Nome do WhatsApp: ${nomeWhatsapp}
WhatsApp ID: ${numeroLimpo}

Última mensagem:
${texto}

Motivo:
${motivo}

A IA foi pausada para esse cliente por 30 minutos.`
});

                console.log(`Cliente ${numeroCliente} pausado por 30 minutos.`);
            }

        } catch (error) {
            console.error("Erro ao responder:", error.message);

            await sock.sendMessage(NUMERO_HUMANO, {
                text:
`⚠️ Erro no bot do WhatsApp

Erro: ${error.message}`
            });
        }
    });
}

carregarDados();

app.listen(3001, () => {
    console.log("Painel API rodando na porta 3001");
});

startBot();