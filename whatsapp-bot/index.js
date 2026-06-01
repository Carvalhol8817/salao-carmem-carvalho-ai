const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

const NUMERO_HUMANO = "5543920005386@s.whatsapp.net";
const TEMPO_PAUSA_HUMANO = 30 * 60 * 1000; // 30 minutos
const LIMITE_MEMORIA = 10;

let IA_ATIVA = true;

const clientesPausados = {};
const conversas = {};
const clientes = {};

function limparNumero(numeroCliente) {
    return numeroCliente.replace(/@.*/, "");
}

function salvarNomeCliente(numeroCliente, nomeCliente) {
    if (!nomeCliente) return;

    clientes[numeroCliente] = {
        ...(clientes[numeroCliente] || {}),
        nome: nomeCliente
    };
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

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log("\nEscaneie o QR Code:\n");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log("WhatsApp conectado com sucesso!");
        }

        if (connection === "close") {
            console.log("Conexão fechada, reiniciando...");
            startBot();
        }
    });

    sock.ev.on("messages.upsert", async (msg) => {
        try {
            const message = msg.messages[0];

            if (!message.message || message.key.fromMe) return;

            const numeroCliente = message.key.remoteJid;
            const nomeWhatsapp = message.pushName || "Não identificado";

            const texto = (
                message.message.conversation ||
                message.message.extendedTextMessage?.text ||
                ""
            ).trim();

            if (!texto) return;

            console.log("Cliente:", numeroCliente, texto);

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

            const response = await axios.post("http://localhost:5000/chat", {
                mensagem: texto,
                historico: historicoAntesDaMensagem
            });

            const resposta = response.data.resposta;
            const transferirHumano = response.data.transferir_humano;
            const motivo = response.data.motivo || "A IA identificou que precisa de atendimento humano.";
            const nomeCliente = response.data.nome_cliente;

            if (nomeCliente) {
                salvarNomeCliente(numeroCliente, nomeCliente);
            }

            await sock.sendMessage(numeroCliente, { text: resposta });

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

startBot();