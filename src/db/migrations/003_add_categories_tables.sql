CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type transaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_type_name ON categories (type, LOWER(name));

CREATE TABLE IF NOT EXISTS transaction_categories (
    transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    PRIMARY KEY (transaction_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_categories_category_id
    ON transaction_categories (category_id);

INSERT INTO categories (name, type)
VALUES
    ('Salário', 'income'),
    ('Investimentos', 'income'),
    ('Vendas', 'income'),
    ('Moradia', 'expense'),
    ('Alimentação', 'expense'),
    ('Transporte', 'expense')
ON CONFLICT DO NOTHING;
