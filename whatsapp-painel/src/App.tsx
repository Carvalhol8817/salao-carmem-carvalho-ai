export default function PainelWhatsAppSalao() {
  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-bold">
              W
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-800">
                WhatsApp do Salão
              </h1>
              <p className="text-zinc-500 text-sm">
                Painel de conexão e monitoramento
              </p>
            </div>
          </div>

          <div className="bg-zinc-100 rounded-2xl p-5 mb-6 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-zinc-700">
                Status da conexão
              </span>

              <span className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 text-sm font-semibold">
                Aguardando conexão
              </span>
            </div>

            <div className="w-full aspect-square bg-white rounded-2xl border border-dashed border-zinc-300 flex items-center justify-center overflow-hidden">
              <div className="text-center p-6">
                <div className="text-6xl mb-4">📱</div>
                <p className="font-medium text-zinc-700">
                  QR Code aparecerá aqui
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                  Escaneie usando o WhatsApp do salão
                </p>
              </div>
            </div>
          </div>

          <button className="w-full bg-black hover:bg-zinc-800 transition text-white font-semibold py-4 rounded-2xl text-lg">
            Reiniciar conexão
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-zinc-200">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-800 mb-2">
              Atividade do Bot
            </h2>
            <p className="text-zinc-500">
              Monitoramento em tempo real das mensagens
            </p>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">

            <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-800">
                  Cliente
                </span>
                <span className="text-sm text-zinc-500">
                  14:32
                </span>
              </div>

              <p className="text-zinc-700">
                Qual o valor da permanente afro?
              </p>
            </div>

            <div className="bg-black rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  IA do Salão
                </span>
                <span className="text-sm text-zinc-300">
                  14:32
                </span>
              </div>

              <p>
                Olá 😊 O valor depende do tamanho e volume do cabelo. Se quiser, pode enviar uma foto para avaliarmos melhor.
              </p>
            </div>

            <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-800">
                  Cliente
                </span>
                <span className="text-sm text-zinc-500">
                  14:35
                </span>
              </div>

              <p className="text-zinc-700">
                Vocês atendem sábado?
              </p>
            </div>

            <div className="bg-black rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  IA do Salão
                </span>
                <span className="text-sm text-zinc-300">
                  14:35
                </span>
              </div>

              <p>
                Sim 😊 Atendemos de terça a sábado das 08h às 18h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
