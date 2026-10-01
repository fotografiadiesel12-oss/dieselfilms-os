---
name: postar-no-crm
description: Posta uma novidade/atualização no Feed do CRM DieselFilms OS como o bot Dieselzinho. Use quando o usuário pedir pra "postar no CRM", "postar no Feed", "avisar a equipe" sobre atualizações, ou postar um arquivo .html (relatório, página) no Feed.
---

# Postar no Feed como o Dieselzinho

O Dieselzinho é o bot da DieselFilms (avatar de claquete). Ele posta pela rota
`/api/bot-post` usando a chave `BOT_SECRET` do arquivo `.env` (fora do GitHub; a
mesma chave precisa estar nas variáveis de ambiente da Vercel).

## Passos

1. Escreva uma descrição curta, animada e em PT-BR simples, na voz do
   Dieselzinho, com 1 a 3 frases e no máximo 2 emojis. Exemplo:
   "🎬 Fique por dentro das atualizações que foram feitas no CRM! Toque na página abaixo pra ver tudo que mudou e o que vem por aí."
2. Se houver um .html para postar, confirme que ele é um arquivo único
   (CSS e JS dentro dele) e tem no máximo 3 MB.
3. Mostre ao usuário o texto que vai ser postado e peça um "pode postar" antes
   de publicar, porque o post fica visível pra toda a equipe.
4. Rode a partir da raiz do projeto:

   ```bash
   node scripts/postar-no-feed.mjs --texto "<descrição>" --html <arquivo.html>
   ```

   (`--html` é opcional; dá pra postar só texto.)
5. Avise o usuário que foi publicado.

## Erros comuns
- `503 Bot ainda não configurado`: falta `BOT_SECRET` na Vercel (o usuário cola
  o valor do `.env` em Settings → Environment Variables e faz redeploy).
- `401 Chave do bot inválida`: a chave do `.env` é diferente da que está na Vercel.
- `Falta BOT_SECRET no arquivo .env`: gere uma nova chave com
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
  salve como `BOT_SECRET=...` no `.env` e peça ao usuário pra atualizar a Vercel.
