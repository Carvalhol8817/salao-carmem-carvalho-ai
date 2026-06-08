import { useEffect, useState } from "react";

type ClientePausado = {
  numero: string;
  nome: string;
  pausado_ate: number;
};

type ConversaPainel = {
  numero: string;
  nome: string;
  ultima_mensagem_cliente: string;
  ultima_resposta_ia: string;
  origem: "cliente" | "ia";
  atualizado_em: number;
  pausado: boolean;
  nova_mensagem: boolean;
};

type StatusBot = {
  ia_ativa: boolean;
  whatsapp_conectado: boolean;
  clientes_pausados: number;
  clientes_conhecidos: number;
  qr_code: string | null;
  clientes_pausados_lista: ClientePausado[];
  conversas_ativas: ConversaPainel[];
  ultimas_conversas: ConversaPainel[];
  mensagens_hoje: number;
};

export default function PainelWhatsAppSalao() {
  const [status, setStatus] = useState<StatusBot | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  function formatarHorario(timestamp: number) {
    if (!timestamp) return "";

    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function tempoRelativo(timestamp: number) {
    if (!timestamp) return "";

    const agora = Date.now();
    const diferenca = agora - timestamp;
    const minutos = Math.floor(diferenca / 60000);

    if (minutos < 1) return "Agora";
    if (minutos === 1) return "há 1 min";
    if (minutos < 60) return `há ${minutos} min`;

    const horas = Math.floor(minutos / 60);

    if (horas === 1) return "há 1 hora";
    if (horas < 24) return `há ${horas} horas`;

    return new Date(timestamp).toLocaleDateString("pt-BR");
  }

  async function buscarStatus() {
    try {
      const resposta = await fetch("http://localhost:3001/status");
      const dados = await resposta.json();
      setStatus(dados);
      setErro("");
    } catch {
      setErro("Não foi possível conectar ao bot. Verifique se o Node está rodando.");
    }
  }

  async function ligarIA() {
    setCarregando(true);
    await fetch("http://localhost:3001/ia/ligar", { method: "POST" });
    await buscarStatus();
    setCarregando(false);
  }

  async function desligarIA() {
    setCarregando(true);
    await fetch("http://localhost:3001/ia/desligar", { method: "POST" });
    await buscarStatus();
    setCarregando(false);
  }

  async function gerarNovoQRCode() {
    setCarregando(true);
    await fetch("http://localhost:3001/whatsapp/reiniciar", { method: "POST" });
    await buscarStatus();
    setCarregando(false);
  }

  async function reativarCliente(numeroCliente: string) {
    setCarregando(true);

    await fetch("http://localhost:3001/cliente/reativar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numeroCliente }),
    });

    await buscarStatus();
    setCarregando(false);
  }

  useEffect(() => {
    buscarStatus();

    const intervalo = setInterval(() => {
      buscarStatus();
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  const conversasAtivasFiltradas =
    status?.conversas_ativas?.filter((conversa) =>
      conversa.nome?.toLowerCase().includes(busca.toLowerCase())
    ) || [];

  const ultimasConversasFiltradas =
    status?.ultimas_conversas?.filter((conversa) =>
      conversa.nome?.toLowerCase().includes(busca.toLowerCase())
    ) || [];

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-200 h-[720px] overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-bold">
              IA
            </div>

            <div>
              <h1 className="text-2xl font-bold text-zinc-800">
                Salão Carmem Carvalho
              </h1>
              <p className="text-zinc-500 text-sm">
                Painel de controle do atendimento
              </p>
            </div>
          </div>

          {erro && (
            <div className="bg-red-100 text-red-700 rounded-2xl p-4 mb-5 font-medium">
              {erro}
            </div>
          )}

          <div className="bg-zinc-100 rounded-2xl p-5 mb-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-zinc-700">Status da IA</span>

              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  status?.ia_ativa
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {status?.ia_ativa ? "Ligada" : "Desligada"}
              </span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-zinc-700">
                Status do WhatsApp
              </span>

              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  status?.whatsapp_conectado
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {status?.whatsapp_conectado ? "Conectado" : "Desconectado"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-zinc-200">
                <p className="text-sm text-zinc-500">Clientes pausados</p>
                <p className="text-3xl font-bold text-zinc-800">
                  {status?.clientes_pausados ?? 0}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-zinc-200">
                <p className="text-sm text-zinc-500">
                  Mensagens hoje
                </p>
                <p className="text-3xl font-bold text-zinc-800">
                  {status?.mensagens_hoje ?? 0}
                </p>
              </div>
            </div>
          </div>

          {!status?.whatsapp_conectado && status?.qr_code && (
            <div className="bg-white rounded-2xl p-5 mb-6 border border-zinc-200 text-center">
              <p className="font-semibold text-zinc-800 mb-3">
                Escaneie o QR Code para conectar o WhatsApp
              </p>

              <img
                src={status.qr_code}
                alt="QR Code do WhatsApp"
                className="w-64 h-64 mx-auto"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={ligarIA}
              disabled={carregando}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 transition text-white font-semibold py-4 rounded-2xl text-lg"
            >
              Ligar IA
            </button>

            <button
              onClick={desligarIA}
              disabled={carregando}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 transition text-white font-semibold py-4 rounded-2xl text-lg"
            >
              Desligar IA
            </button>
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-4">
            <p className="text-sm font-semibold text-zinc-700 mb-2">
              <h3 className="text-sm font-semibold text-zinc-500">
                ⚙️ Manutenção
              </h3>
            </p>

            <button
              onClick={gerarNovoQRCode}
              disabled={carregando}
              className="w-full bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 transition text-white font-semibold py-3 rounded-xl text-sm"
            >
              Reconectar WhatsApp / Gerar QR Code
            </button>
            <button
              className="w-full mt-3 bg-red-900 hover:bg-red-800 text-white py-3 rounded-xl font-semibold"
            >
              Encerrar Sistema
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-200 h-[720px] overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-800 mb-2">
              Atendimento em tempo real
            </h2>
            <p className="text-zinc-500">
              Acompanhe conversas ativas, clientes pausados e últimas interações.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-5 border border-zinc-200 mb-6">
            <input
              type="text"
              placeholder="🔍Pesquisar cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-zinc-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-zinc-800 mb-3">
                🔴 Clientes pausados ({status?.clientes_pausados_lista?.length || 0})
              </h3>

              {status?.clientes_pausados_lista?.length ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {status.clientes_pausados_lista.map((cliente) => (
                    <div
                      key={cliente.numero}
                      className="bg-zinc-100 rounded-2xl p-3 border border-zinc-200"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-zinc-800">
                            {cliente.nome || "Não identificado"}
                          </p>
                        </div>

                        <button
                          onClick={() => reativarCliente(cliente.numero)}
                          disabled={carregando}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl"
                        >
                          Reativar IA
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Nenhum cliente pausado no momento.
                </p>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-800 mb-3">
                🟢 Conversas ativas ({conversasAtivasFiltradas.length})
              </h3>

              {conversasAtivasFiltradas.length ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {conversasAtivasFiltradas.map((conversa) => (
                    <div
                      key={conversa.numero}
                      className="bg-zinc-100 rounded-2xl p-3 border border-zinc-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-zinc-800">
                          {conversa.nome || "Não identificado"}
                        </p>

                        {conversa.nova_mensagem && (
                          <span className="inline-block text-xs bg-green-500 text-white px-2 py-1 rounded-full mt-1">
                            🔔 Nova mensagem
                          </span>
                        )}

                        <span className="text-xs text-zinc-500">
                          {tempoRelativo(conversa.atualizado_em)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">
                        {conversa.origem === "ia" ? "IA respondeu" : "Cliente enviou"}
                      </p>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500">
                           👤 Cliente
                          </p>
                          <p className="text-zinc-700">
                            {conversa.ultima_mensagem_cliente
                              ? conversa.ultima_mensagem_cliente.substring(0, 80) + "..."
                              : "Sem mensagem registrada"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-zinc-500">
                           🤖 IA
                          </p>
                          <p className="text-zinc-700">
                            {conversa.ultima_resposta_ia
                              ? conversa.ultima_resposta_ia.substring(0, 80) + "..."
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Nenhuma conversa ativa no momento.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}