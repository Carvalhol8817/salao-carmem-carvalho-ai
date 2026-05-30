import json
from flask import Flask, request, jsonify
from openai import OpenAI
from config import OPENAI_API_KEY
from prompts import PROMPT_SALAO

app = Flask(__name__)
client = OpenAI(api_key=OPENAI_API_KEY)


@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True)
        mensagem = data.get("mensagem", "")
        historico = data.get("historico", [])

        if not mensagem:
            return jsonify({
                "resposta": "Não consegui entender sua mensagem. Pode enviar novamente?",
                "transferir_humano": False,
                "motivo": "Mensagem vazia"
            })

        resposta = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": PROMPT_SALAO + """

IMPORTANTE:
Responda SEMPRE em JSON válido, neste formato:

{
  "resposta": "mensagem que será enviada ao cliente",
  "transferir_humano": true ou false,
  "motivo": "explique brevemente o motivo",
  "nome_cliente": "nome do cliente se souber, senão null"
}

Use transferir_humano como true quando:
- cliente pedir para falar com uma pessoa
- houver reclamação
- cliente estiver irritado ou insatisfeito
- assunto envolver problema com procedimento químico
- dúvida for muito específica e precisar da equipe
- cliente quiser confirmar disponibilidade real de agenda

REGRAS DE MEMÓRIA:
- Use o histórico para entender o contexto da conversa.
- Não cumprimente novamente se a conversa já começou.
- Se o cliente já informou o nome, use o nome naturalmente.
- Não repita informações que já foram enviadas recentemente.
- Responda considerando as mensagens anteriores.
- Se o cliente perguntar algo complementar, responda apenas o complemento.
- Mantenha respostas curtas e naturais.

IDENTIFICAÇÃO DO CLIENTE:

- Sempre tente identificar o nome do cliente.
- Se o cliente informar seu nome, retorne esse nome em nome_cliente.
- Se não souber o nome, retorne null.
- Não invente nomes.
- Se o histórico já possuir o nome do cliente, utilize o mesmo nome.
"""
                },
                *historico,
                {"role": "user", "content": mensagem}
            ],
            response_format={"type": "json_object"}
        )

        conteudo = resposta.choices[0].message.content
        dados = json.loads(conteudo)

        return jsonify({
            "resposta": dados.get("resposta", "Certo 😊 Vou encaminhar para nossa equipe te ajudar melhor."),
            "transferir_humano": dados.get("transferir_humano", False),
            "motivo": dados.get("motivo", "Sem motivo informado"),
            "nome_cliente": dados.get("nome_cliente", None)
        })

    except Exception as e:
        print(e)
        return jsonify({
            "resposta": "Tivemos uma instabilidade por aqui. Vou chamar alguém da equipe para te ajudar melhor 😊",
            "transferir_humano": True,
            "motivo": str(e)
        }), 200


app.run(port=5000)