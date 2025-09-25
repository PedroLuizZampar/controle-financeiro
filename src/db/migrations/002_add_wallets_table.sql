CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
    default_wallet_id INTEGER;
BEGIN
    INSERT INTO wallets (name, description)
    VALUES ('Carteira Principal', 'Carteira criada automaticamente.')
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO default_wallet_id;

    IF default_wallet_id IS NULL THEN
        SELECT id INTO default_wallet_id
        FROM wallets
        WHERE name = 'Carteira Principal'
        LIMIT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'wallet_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN wallet_id INTEGER;
        UPDATE transactions SET wallet_id = default_wallet_id WHERE wallet_id IS NULL;
        ALTER TABLE transactions ALTER COLUMN wallet_id SET NOT NULL;
        ALTER TABLE transactions ADD CONSTRAINT transactions_wallet_id_fkey
            FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date ON transactions (wallet_id, date DESC, id DESC);
