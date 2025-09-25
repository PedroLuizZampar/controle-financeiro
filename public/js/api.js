const TRANSACTIONS_URL = '/api/transactions';
const WALLETS_URL = '/api/wallets';
const CATEGORIES_URL = '/api/categories';
const GOALS_URL = '/api/goals';

async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const hasJson = contentType && contentType.includes('application/json');
    const payload = hasJson ? await response.json() : await response.text();

    if (!response.ok) {
        const message = hasJson && payload?.message ? payload.message : 'Erro inesperado no servidor';
        throw new Error(message);
    }

    return payload;
}

export async function fetchTransactions(walletId) {
    const query = walletId ? `?walletId=${encodeURIComponent(walletId)}` : '';
    const response = await fetch(`${TRANSACTIONS_URL}${query}`);
    return handleResponse(response);
}

export async function createTransaction(data) {
    const response = await fetch(TRANSACTIONS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    return handleResponse(response);
}

export async function updateTransaction(id, data) {
    const response = await fetch(`${TRANSACTIONS_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

export async function deleteTransaction(id, walletId) {
    const query = walletId ? `?walletId=${encodeURIComponent(walletId)}` : '';
    const response = await fetch(`${TRANSACTIONS_URL}/${id}${query}`, {
        method: 'DELETE'
    });

    await handleResponse(response);
}

export async function fetchWallets() {
    const response = await fetch(WALLETS_URL);
    return handleResponse(response);
}

export async function createWallet(data) {
    const response = await fetch(WALLETS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    return handleResponse(response);
}

export async function updateWallet(id, data) {
    const response = await fetch(`${WALLETS_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

export async function deleteWallet(id) {
    const response = await fetch(`${WALLETS_URL}/${id}`, { method: 'DELETE' });
    await handleResponse(response);
}

export async function fetchCategories() {
    const response = await fetch(CATEGORIES_URL);
    return handleResponse(response);
}

export async function createCategory(data) {
    const response = await fetch(CATEGORIES_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    return handleResponse(response);
}

export async function updateCategory(id, data) {
    const response = await fetch(`${CATEGORIES_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

export async function deleteCategory(id) {
    const response = await fetch(`${CATEGORIES_URL}/${id}`, { method: 'DELETE' });
    await handleResponse(response);
}

export async function fetchGoals(walletId) {
    const query = walletId ? `?walletId=${encodeURIComponent(walletId)}` : '';
    const response = await fetch(`${GOALS_URL}${query}`);
    return handleResponse(response);
}

export async function createGoal(data) {
    const response = await fetch(GOALS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    return handleResponse(response);
}

export async function updateGoal(id, data) {
    const response = await fetch(`${GOALS_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(response);
}

export async function deleteGoal(id, walletId) {
    const query = walletId ? `?walletId=${encodeURIComponent(walletId)}` : '';
    const response = await fetch(`${GOALS_URL}/${id}${query}`, { method: 'DELETE' });
    await handleResponse(response);
}
