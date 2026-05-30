from openai import OpenAI
from prompts import PROMPT_SALAO
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

print("IA do salão iniciada!")

while True:
    mensagem = input("\nCliente: ")

    resposta = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": PROMPT_SALAO
            },
            {
                "role": "user",
                "content": mensagem
            }
        ]
    )

    print("\nIA:", resposta.choices[0].message.content)