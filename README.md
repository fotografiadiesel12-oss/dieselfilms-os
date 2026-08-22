# DieselFilms OS

Sistema de gestão interno da DieselFilms Fotografia e Audiovisual.

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Deploy na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Em vercel.com → Add New → Project → Import Git Repository.
3. Selecione o repositório. O preset "Vite" é detectado automaticamente.
4. Deploy.

## Importante

Este projeto ainda guarda os dados (equipe, demandas, financeiro, contratos)
no **localStorage do navegador** de cada pessoa — não em um banco de dados
compartilhado. Ou seja, cada computador/navegador tem seus próprios dados
por enquanto. Para dados compartilhados entre a equipe (o objetivo final),
é necessário adicionar um backend com banco de dados real.
