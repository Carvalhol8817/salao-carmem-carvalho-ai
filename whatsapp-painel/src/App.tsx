import { useEffect, useState } from "react";

type StatusBot = {
  ia_ativa: boolean;
  whatsapp_conectado: boolean;
  clientes_pausados: number;
  clientes_conhecidos: number;
};

export default function PainelWhatsAppSalao() {
  const [status, setStatus] = useState<StatusBot | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

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

  useEffect(() => {
    buscarStatus();

    const intervalo = setInterval(() => {
      buscarStatus();
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-200">
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
              <span className="font-semibold text-zinc-700">
                Status da IA
              </span>

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
            <div className="flex items-center justify-between mt-4">
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
                <p className="text-sm text-zinc-500">Clientes conhecidos</p>
                <p className="text-3xl font-bold text-zinc-800">
                  {status?.clientes_conhecidos ?? 0}
                </p>
              </div>
            </div>
          </div>

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
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-800 mb-2">
              Como usar
            </h2>
            <p className="text-zinc-500">
              Esse painel controla o atendimento automático do WhatsApp.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200">
              <p className="font-semibold text-zinc-800 mb-1">
                🟢 Ligar IA
              </p>
              <p className="text-zinc-600">
                Use quando o salão abrir e quiser que a IA responda os clientes automaticamente.
              </p>
            </div>

            <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200">
              <p className="font-semibold text-zinc-800 mb-1">
                🔴 Desligar IA
              </p>
              <p className="text-zinc-600">
                Use quando forem embora ou quando quiserem atender tudo manualmente.
              </p>
            </div>

            <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200">
              <p className="font-semibold text-zinc-800 mb-1">
                👥 Clientes pausados
              </p>
              <p className="text-zinc-600">
                Mostra quantos clientes estão com a IA pausada porque foram encaminhados para atendimento humano.
              </p>
            </div>

            <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200">
              <p className="font-semibold text-zinc-800 mb-1">
                📌 Importante
              </p>
              <p className="text-zinc-600">
                Para funcionar, o servidor Python e o bot do WhatsApp precisam estar ligados.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}