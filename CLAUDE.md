# DieselFilms OS — instruções para o Claude

CRM interno da DieselFilms (produtora audiovisual). Quem pede as mudanças são
os sócios, que não são programadores.

## Como falar com quem pede
- Responda sempre em **português do Brasil simples**, sem termos técnicos sem
  explicação. Quem pede não lê inglês.
- Explique o que mudou do ponto de vista de quem usa o CRM, não do código.

## Antes de começar qualquer mudança
- Mais de uma pessoa mexe neste projeto. Sempre rode `git pull` antes de
  começar, pra não trabalhar em cima de uma versão velha.
- Se o `git pull` der conflito, pare e explique a situação antes de resolver.

## Como o site é atualizado
- Site: https://dieselfilms-os.vercel.app (Vercel).
- **Tudo que é enviado (`git push`) para a branch `main` vai pro ar sozinho**
  em 1 ou 2 minutos, e a equipe usa esse site todos os dias. Só envie depois
  de testar, e avise quem pediu antes de enviar.
- Commits em português, explicando o que mudou pra quem usa.

## Estrutura
- `src/App.jsx`: quase todo o front-end (React + Tailwind), com um componente
  por módulo (Feed, Painel, Leads, Demandas, Financeiro, Orçamentos,
  Contratos, Clientes, Acesso).
- `src/OrcamentoPublico.jsx`: página do orçamento que vai pro cliente.
- `api/`: funções do servidor (Vercel). Os dados ficam no Vercel KV e as
  fotos, vídeos e .html no Vercel Blob.
- `api/_lib/session.js`: login (token assinado com `SESSION_SECRET`) e as
  regras de permissão por cargo e módulo.

## Testar antes de enviar
- `npm run dev` sozinho **não** roda a pasta `api/`, então o login e os dados
  não funcionam assim.
- Use a cópia de teste com dados de mentira (o login aceita qualquer e-mail e
  senha):

  ```bash
  npx vite --config .claude/vite.mock.config.js
  ```

  Depois abra http://localhost:5199. Teste também no tamanho de celular
  (390px de largura), porque a equipe usa muito pelo celular.
- Antes de enviar, confira que compila: `npx vite build`. Para arquivos da
  pasta `api/`, rode também `node --check <arquivo>`. Um erro de sintaxe num
  arquivo da `api/` já derrubou o Feed inteiro sem ninguém perceber.

## Cuidados que já deram problema
- Em grades CSS use `minmax(0, 1fr)` em vez de `1fr`. Com `1fr`, o conteúdo
  empurra a coluna pra fora da tela no celular.
- Os arquivos .html postados no Feed são mostrados isolados por
  `api/html-view.js` (CSP sandbox). Não troque isso por mostrar o HTML
  direto na página do CRM, porque ele teria acesso ao login de quem está vendo.
- Chaves secretas (`SESSION_SECRET`, `BOT_SECRET`) ficam só na Vercel e no
  `.env` local. Nunca escreva uma chave no código, no chat ou num commit.

## Dieselzinho (bot do Feed)
- Pra "postar no CRM" uma novidade, use a skill `postar-no-crm`.
- O bot precisa da `BOT_SECRET` no `.env` local. Sem ela, o bot não posta,
  mas todo o resto do projeto funciona normalmente.
