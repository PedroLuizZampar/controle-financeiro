# Controle Financeiro - MVP

Este projeto é um MVP de controle financeiro com frontend em HTML/CSS/JS puro e backend em Node.js + Express integrado a um banco PostgreSQL.

## 📁 Estrutura do projeto

```
controle-financeiro/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   └── modals.js
│   └── index.html
├── src/
│   ├── controllers/
│   │   ├── categoriesController.js
│   │   ├── transactionsController.js
│   │   └── walletsController.js
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_transactions_table.sql
│   │   │   ├── 002_add_wallets_table.sql
│   │   │   └── 003_add_categories_tables.sql
│   │   └── pool.js
│   ├── routes/
│   │   ├── categories.js
│   │   ├── transactions.js
│   │   └── wallets.js
│   ├── scripts/
│   │   └── runMigrations.js
│   ├── services/
│   │   ├── categoriesService.js
│   │   ├── transactionsService.js
│   │   └── walletsService.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## 🚀 Como rodar localmente

1. **Instale as dependências**

   ```powershell
   npm install
   ```

2. **Configure o banco**

   - Copie o arquivo `.env.example` para `.env` e preencha com as credenciais do seu banco PostgreSQL.
   - Crie o banco de dados definido em `PGDATABASE` caso ainda não exista.
   - Execute as migrações:

     ```powershell
     npm run migrate
     ```

3. **Inicie o servidor em modo desenvolvimento**

   ```powershell
   npm run dev
   ```

   O frontend estará disponível em [http://localhost:3000](http://localhost:3000).

## 🧪 Endpoints da API

### Categorias
- `GET /api/categories` → Lista todas as categorias cadastradas (receitas e despesas).
- `POST /api/categories` → Cria uma nova categoria.

  ```json
  {
    "name": "Alimentação",
    "type": "expense"
  }
  ```

### Carteiras
- `GET /api/wallets` → Lista todas as carteiras com totais consolidados (entradas, saídas e saldo).
- `POST /api/wallets` → Cria uma nova carteira.

  ```json
  {
    "name": "Conta Corrente",
    "description": "Carteira destinada às despesas fixas"
  }
  ```

### Transações
- `GET /api/transactions?walletId=1` → Lista as transações da carteira informada, ordenadas da mais recente para a mais antiga.
- `POST /api/transactions` → Cria uma nova transação associada a uma carteira.

  ```json
  {
    "description": "Salário",
    "amount": 1500.50,
    "type": "income",
    "date": "2025-09-24",
    "walletId": 1,
    "categories": [1, 3]
  }
  ```

- `DELETE /api/transactions/:id?walletId=1` → Remove uma transação pertencente à carteira informada.

## 🧱 Migrações

A primeira migração cria a tabela de transações. A segunda adiciona o suporte a carteiras (com uma carteira padrão chamada **Carteira Principal**). A terceira cria o catálogo de categorias, relacionando-as às transações por meio de uma tabela de junção. As migrações em `src/db/migrations` são executadas em ordem alfabética pelo script `npm run migrate`. Adicione novos arquivos `.sql` numerados sequencialmente para futuras alterações de schema.

## 🛠️ Tecnologias

- Node.js + Express
- PostgreSQL (via `pg`)
- Frontend em HTML + CSS + JavaScript (sem frameworks)

## 📝 Licença

MIT
