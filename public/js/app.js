import { ModalManager } from './modals.js';
import { NavigationManager } from './navigation.js';
import { WalletSelectorManager } from './wallet-selector.js';
import { DashboardManager } from './dashboard.js';
import { IconPicker } from './icons.js';
import {
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    fetchWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal
} from './api.js';

const DEFAULT_VISUALS = {
    wallet: { icon: 'fa-solid fa-wallet', color: '#22c55e' },
    category: { icon: 'fa-solid fa-tag', color: '#6366f1' },
    goal: { icon: 'fa-solid fa-bullseye', color: '#f97316' }
};

const HEX_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function normalizeHexColor(hex, fallback = '#000000') {
    if (typeof hex !== 'string') {
        return fallback;
    }
    const value = hex.trim();
    return HEX_PATTERN.test(value) ? value : fallback;
}

function getContrastColor(hex) {
    const normalized = normalizeHexColor(hex, '#ffffff');
    // Suporta formato #RRGGBB ou #RRGGBBAA (ignorando alfa)
    const base = normalized.length >= 7 ? normalized.slice(0, 7) : normalized;
    const r = parseInt(base.slice(1, 3), 16) / 255;
    const g = parseInt(base.slice(3, 5), 16) / 255;
    const b = parseInt(base.slice(5, 7), 16) / 255;

    const srgb = [r, g, b].map((value) => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
    const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return luminance > 0.6 ? '#0f172a' : '#f8fafc';
}

function normalizeVisual(visual = {}, fallback) {
    return {
        icon: visual.icon || fallback.icon,
        color: normalizeHexColor(visual.color, fallback.color)
    };
}

class TemplateManager {
    constructor() {
        this.templates = {
            balance: document.getElementById('balance-template'),
            form: document.getElementById('form-template'),
            transaction: document.getElementById('transaction-template'),
            emptyState: document.getElementById('empty-state-template'),
            wallet: document.getElementById('wallet-template'),
            walletForm: document.getElementById('wallet-form-template'),
            category: document.getElementById('category-template'),
            categoryForm: document.getElementById('category-form-template'),
            categoryOption: document.getElementById('category-option-template'),
            goal: document.getElementById('goal-template'),
            goalForm: document.getElementById('goal-form-template')
        };
    }

    updateVisualChip(element, { icon, color }, fallbackKey) {
        if (!element) {
            return;
        }

        const defaults = DEFAULT_VISUALS[fallbackKey] ?? { icon: 'fa-solid fa-circle', color: '#cbd5f5' };
        const safeColor = normalizeHexColor(color, defaults.color);
        element.style.background = safeColor;
        element.style.color = getContrastColor(safeColor);

        const iconElement = element.querySelector('i');
        const finalIcon = icon || defaults.icon;
        if (iconElement) {
            iconElement.className = finalIcon;
            iconElement.setAttribute('aria-hidden', 'true');
        } else {
            element.innerHTML = `<i class="${finalIcon}" aria-hidden="true"></i>`;
        }
    }

    renderBalance(container, { balance, totalIncome, totalExpense }) {
        const fragment = this.templates.balance.content.cloneNode(true);
        fragment.querySelector('[data-balance]').textContent = this.formatCurrency(balance);
        fragment.querySelector('[data-income]').textContent = this.formatCurrency(totalIncome);
        fragment.querySelector('[data-expense]').textContent = this.formatCurrency(totalExpense);

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    renderTransactionsList(container, transactions) {
        container.innerHTML = '';

        transactions.forEach((transaction) => {
            const fragment = this.templates.transaction.content.cloneNode(true);
            fragment.querySelector('[data-description]').textContent = transaction.description;
            fragment.querySelector('[data-date]').textContent = this.formatDate(transaction.date);

            const valueElement = fragment.querySelector('[data-value]');
            const typeClass = transaction.type === 'income' ? 'income' : 'expense';
            const typeSymbol = transaction.type === 'income' ? '+' : '-';

            valueElement.className = `transaction-value ${typeClass}`;
            valueElement.textContent = `${typeSymbol}${this.formatCurrency(transaction.amount)}`;

            const removeButton = fragment.querySelector('[data-remove]');
            removeButton.dataset.id = transaction.id;

            const editButton = fragment.querySelector('[data-edit-transaction]');
            if (editButton) {
                editButton.dataset.id = transaction.id;
            }

            const categoriesContainer = fragment.querySelector('[data-transaction-categories]');

            if (categoriesContainer) {
                const hasCategories = Array.isArray(transaction.categories) && transaction.categories.length > 0;

                if (!hasCategories) {
                    categoriesContainer.remove();
                } else {
                    categoriesContainer.innerHTML = '';
                    transaction.categories.forEach((category) => {
                        const badge = document.createElement('span');
                        badge.className = 'transaction-category-badge';
                        const fallbackColor = category.type === 'income' ? DEFAULT_VISUALS.wallet.color : '#ef4444';
                        const safeColor = normalizeHexColor(category.color, fallbackColor);
                        badge.style.background = safeColor;
                        badge.style.color = getContrastColor(safeColor);
                        const iconClass = category.icon || DEFAULT_VISUALS.category.icon;
                        badge.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><span>${category.name}</span>`;
                        categoriesContainer.appendChild(badge);
                    });
                }
            }

            container.appendChild(fragment);
        });
    }

    renderEmptyState(container) {
        const fragment = this.templates.emptyState.content.cloneNode(true);
        container.innerHTML = '';
        container.appendChild(fragment);
    }

    renderWalletsList(container, wallets, activeWalletId) {
        container.innerHTML = '';

        if (wallets.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'wallets-empty';
            empty.textContent = 'Nenhuma carteira cadastrada. Crie a primeira carteira para começar.';
            container.appendChild(empty);
            return;
        }

        wallets.forEach((wallet) => {
            const fragment = this.templates.wallet.content.cloneNode(true);
            const walletElement = fragment.querySelector('[data-wallet]');

            walletElement.dataset.walletId = wallet.id;

            if (wallet.id === activeWalletId) {
                walletElement.classList.add('is-active');
            }

            fragment.querySelector('[data-wallet-name]').textContent = wallet.name;
            fragment.querySelector('[data-wallet-balance]').textContent = this.formatCurrency(wallet.balance);

            const descriptionElement = fragment.querySelector('[data-wallet-description]');
            if (descriptionElement) {
                if (wallet.description) {
                    descriptionElement.textContent = wallet.description;
                    descriptionElement.hidden = false;
                } else {
                    descriptionElement.textContent = '';
                    descriptionElement.hidden = true;
                }
            }

            const visualElement = fragment.querySelector('[data-wallet-visual]');
            this.updateVisualChip(visualElement, { icon: wallet.icon, color: wallet.color }, 'wallet');

            const incomeElement = fragment.querySelector('[data-wallet-income]');
            const expenseElement = fragment.querySelector('[data-wallet-expense]');

            if (incomeElement) {
                incomeElement.textContent = `Entradas ${this.formatCurrency(wallet.totalIncome)}`;
            }

            if (expenseElement) {
                expenseElement.textContent = `Saídas ${this.formatCurrency(wallet.totalExpense)}`;
            }

            const deleteBtn = fragment.querySelector('[data-delete-wallet]');
            const editBtn = fragment.querySelector('[data-edit-wallet]');
            if (deleteBtn) deleteBtn.dataset.walletId = wallet.id;
            if (editBtn) editBtn.dataset.walletId = wallet.id;

            container.appendChild(fragment);
        });
    }

    renderCategoriesList(container, categories) {
        container.innerHTML = '';

        if (!categories.length) {
            const empty = document.createElement('div');
            empty.className = 'categories-empty';
            empty.textContent = 'Nenhuma categoria cadastrada. Crie categorias para organizar suas transações.';
            container.appendChild(empty);
            return;
        }

        const groups = {
            income: categories.filter((category) => category.type === 'income'),
            expense: categories.filter((category) => category.type === 'expense')
        };

        Object.entries(groups).forEach(([type, items]) => {
            if (items.length === 0) {
                return;
            }

            const section = document.createElement('div');
            section.className = 'category-group';

            const title = document.createElement('div');
            title.className = 'category-group-title';
            title.textContent = type === 'income' ? 'Categorias de Receitas' : 'Categorias de Despesas';
            section.appendChild(title);

            const list = document.createElement('div');
            list.className = 'category-group-list';

            items.forEach((category) => {
                const fragment = this.templates.category.content.cloneNode(true);
                const categoryElement = fragment.querySelector('[data-category]');

                categoryElement.dataset.categoryId = category.id;
                categoryElement.classList.add(`category-item--${category.type}`);

                fragment.querySelector('[data-category-name]').textContent = category.name;

                const visualElement = fragment.querySelector('[data-category-visual]');
                this.updateVisualChip(visualElement, { icon: category.icon, color: category.color }, 'category');

                list.appendChild(fragment);
            });

            section.appendChild(list);
            container.appendChild(section);
        });
    }

    renderGoalsList(container, goals, formatCurrencyFn, formatDateFn) {
        container.innerHTML = '';

        if (!goals.length) {
            const empty = document.createElement('div');
            empty.className = 'goals-empty';
            empty.textContent = 'Nenhuma meta definida para esta carteira. Crie uma meta para acompanhar seu progresso.';
            container.appendChild(empty);
            return;
        }

        goals.forEach((goal) => {
            const fragment = this.templates.goal.content.cloneNode(true);
            const goalElement = fragment.querySelector('[data-goal]');

            if (goalElement) {
                goalElement.dataset.goalId = goal.id;
                goalElement.classList.add(`goal-item--${goal.type}`);
            }

            const visualElement = fragment.querySelector('[data-goal-visual]');
            this.updateVisualChip(visualElement, { icon: goal.icon, color: goal.color }, 'goal');

            const nameElement = fragment.querySelector('[data-goal-name]');
            if (nameElement) {
                nameElement.textContent = goal.name;
            }

            const periodElement = fragment.querySelector('[data-goal-period]');
            if (periodElement) {
                const start = formatDateFn(goal.currentPeriodStart);
                const end = formatDateFn(goal.currentPeriodEnd);
                periodElement.textContent = `Período: ${start} até ${end}`;
            }

            const typeElement = fragment.querySelector('[data-goal-type]');
            if (typeElement) {
                typeElement.textContent = goal.type === 'income' ? 'Receita' : 'Despesa';
            }

            const progressFill = fragment.querySelector('[data-goal-progress-fill]');
            if (progressFill) {
                const percentage = Math.min(goal.progressPercentage ?? 0, 100);
                progressFill.style.width = `${percentage}%`;
                progressFill.classList.add(`goal-progress-bar-fill--${goal.type}`);
            }

            const progressLabel = fragment.querySelector('[data-goal-progress-label]');
            if (progressLabel) {
                progressLabel.textContent = `${formatCurrencyFn(goal.progressAmount)} alcançados`;
            }

            const targetLabel = fragment.querySelector('[data-goal-target-label]');
            if (targetLabel) {
                targetLabel.textContent = `Meta: ${formatCurrencyFn(goal.targetAmount)}`;
            }

            const statusElement = fragment.querySelector('[data-goal-status]');
            if (statusElement) {
                statusElement.textContent = goal.status === 'achieved'
                    ? 'Meta concluída 🎉'
                    : `Faltam ${formatCurrencyFn(goal.remainingAmount)}`;
            }

            const renewElement = fragment.querySelector('[data-goal-renew]');
            if (renewElement) {
                renewElement.textContent = `Renova a cada ${goal.intervalDays} dia${goal.intervalDays > 1 ? 's' : ''}`;
            }

            container.appendChild(fragment);
        });
    }

    createTransactionForm() {
        const fragment = this.templates.form.content.cloneNode(true);
        const form = document.createElement('form');
        form.id = 'transaction-form';
        form.className = 'transaction-form';

        form.appendChild(fragment);

        // Botão submit inicia como receita
        const submitBtn = form.querySelector('[data-transaction-submit]');
        if (submitBtn) {
            submitBtn.classList.add('btn-income');
        }

        const dateInput = form.querySelector('[name="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        return form;
    }

    createWalletForm() {
        const fragment = this.templates.walletForm.content.cloneNode(true);
        const form = document.createElement('form');
        form.id = 'wallet-form';
        form.className = 'wallet-form';
        form.appendChild(fragment);
        return form;
    }

    fillWalletForm(form, wallet) {
        form.querySelector('[name="name"]').value = wallet.name;
        const desc = form.querySelector('[name="description"]');
        if (desc) desc.value = wallet.description ?? '';
    }

    createCategoryForm() {
        const fragment = this.templates.categoryForm.content.cloneNode(true);
        const form = document.createElement('form');
        form.id = 'category-form';
        form.className = 'category-form';
        form.appendChild(fragment);
        return form;
    }

    fillCategoryForm(form, category) {
        form.querySelector('[name="name"]').value = category.name;
        form.querySelector('[name="type"]').value = category.type;
    }

    createGoalForm({ walletName } = {}) {
        const fragment = this.templates.goalForm.content.cloneNode(true);
        const form = document.createElement('form');
        form.id = 'goal-form';
        form.className = 'goal-form';
        form.appendChild(fragment);

        const walletLabel = form.querySelector('[data-goal-wallet-label]');
        if (walletLabel && walletName) {
            walletLabel.textContent = walletName;
        }

        const startDateInput = form.querySelector('[name="startDate"]');
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }

        const intervalInput = form.querySelector('[name="intervalDays"]');
        if (intervalInput && !intervalInput.value) {
            intervalInput.value = 30;
        }

        const typeSelect = form.querySelector('[name="type"]');
        if (typeSelect && !typeSelect.value) {
            typeSelect.value = 'expense';
        }

        return form;
    }

    fillGoalForm(form, goal) {
        form.querySelector('[name="name"]').value = goal.name;
        form.querySelector('[name="type"]').value = goal.type;
        form.querySelector('[name="targetAmount"]').value = String(goal.targetAmount);
        form.querySelector('[name="startDate"]').value = goal.startDate ?? goal.currentPeriodStart;
        form.querySelector('[name="intervalDays"]').value = String(goal.intervalDays);
    }

    renderCategoryOptions(container, categories, selectedIds = []) {
        container.innerHTML = '';

        if (!categories.length) {
            const empty = document.createElement('div');
            empty.className = 'category-options-empty';
            empty.textContent = 'Nenhuma categoria disponível para este tipo. Utilize o painel de categorias para criar novas opções.';
            container.appendChild(empty);
            return;
        }

        categories.forEach((category) => {
            const fragment = this.templates.categoryOption.content.cloneNode(true);
            const input = fragment.querySelector('[data-category-input]');
            const nameElement = fragment.querySelector('[data-category-option-name]');
            const typeElement = fragment.querySelector('[data-category-option-type]');
            const visualElement = fragment.querySelector('[data-category-option-visual]');

            input.value = category.id;
            input.checked = selectedIds.includes(category.id);
            nameElement.textContent = category.name;

            if (typeElement) {
                typeElement.textContent = category.type === 'income' ? 'Receita' : 'Despesa';
                typeElement.classList.add(`category-option-type--${category.type}`);
            }

            this.updateVisualChip(visualElement, { icon: category.icon, color: category.color }, 'category');

            container.appendChild(fragment);
        });
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value ?? 0);
    }

    formatDate(dateString) {
        if (!dateString) {
            return '';
        }

        if (dateString instanceof Date) {
            return dateString.toLocaleDateString('pt-BR');
        }

        const normalized = `${dateString}`.split('T')[0];
        const date = new Date(`${normalized}T00:00:00`);
        return Number.isNaN(date.getTime()) ? normalized : date.toLocaleDateString('pt-BR');
    }
}

class FinancialControl {
    constructor() {
        this.transactions = [];
        this.wallets = [];
        this.categories = [];
        this.goals = [];
        this.activeWalletId = null;
        this.templates = new TemplateManager();
        this.modalManager = new ModalManager();
        this.iconPicker = new IconPicker();
        
        // Gerenciadores do novo sistema de navegação
        this.navigationManager = new NavigationManager();
        this.walletSelectorManager = new WalletSelectorManager(
            (walletId) => this.handleWalletSelectionFromSelector(walletId)
        );
        this.dashboardManager = new DashboardManager(this);
        
        // Containers serão obtidos dinamicamente conforme a página atual
        this.init();
    }

    setupVisualCustomizer(form, defaults) {
        const preview = form.querySelector('[data-visual-preview]');
        const iconElement = form.querySelector('[data-visual-icon]');
        const iconInput = form.querySelector('[data-visual-icon-input]');
        const colorInput = form.querySelector('[data-visual-color]');
        const triggerButton = form.querySelector('[data-open-icon-picker]');

        if (!preview || !iconElement || !iconInput || !colorInput || !triggerButton) {
            return { setVisual: () => {} };
        }

        const applyVisual = ({ icon, color } = {}) => {
            const finalIcon = icon || defaults.icon;
            const finalColor = normalizeHexColor(color, defaults.color);
            preview.style.background = finalColor;
            preview.style.color = getContrastColor(finalColor);
            iconElement.className = finalIcon;
            iconElement.setAttribute('aria-hidden', 'true');
            iconInput.value = finalIcon;
            colorInput.value = finalColor;
        };

        colorInput.addEventListener('input', () => {
            applyVisual({ icon: iconInput.value, color: colorInput.value });
        });

        triggerButton.addEventListener('click', (event) => {
            event.preventDefault();
            this.iconPicker.open({
                selected: iconInput.value || defaults.icon,
                onSelect: (iconValue) => applyVisual({ icon: iconValue, color: colorInput.value })
            });
        });

        return {
            setVisual: (visual = defaults) => applyVisual(visual)
        };
    }

    closeModals() {
        this.iconPicker.close();
        this.modalManager.close();
    }

    async init() {
        try {
            await this.loadWallets({ preserveActive: false });
            await this.loadCategories();

            if (this.activeWalletId) {
                await this.loadTransactions();
                await this.loadGoals();
            } else {
                this.transactions = [];
                this.goals = [];
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            alert(error.message || 'Não foi possível carregar os dados iniciais.');
        }

        this.setupEventListeners();
        this.setupNavigationListeners();
        
        // Aguardar o DOM estar pronto antes de atualizar
        requestAnimationFrame(() => {
            this.updateDisplay();
        });
    }

    async loadTransactions() {
        if (!this.activeWalletId) {
            this.transactions = [];
            return;
        }

        const transactions = await fetchTransactions(this.activeWalletId);
        this.transactions = transactions.map((transaction) => this.normalizeTransaction(transaction));
    }

    normalizeTransaction(transaction) {
        return {
            ...transaction,
            amount: Number(transaction.amount),
            date: transaction.date,
            walletId: Number(transaction.walletId ?? this.activeWalletId ?? 0),
            categories: Array.isArray(transaction.categories)
                ? transaction.categories.map((category) => ({
                      id: Number(category.id),
                      name: category.name,
                      type: category.type,
                      ...normalizeVisual(category, DEFAULT_VISUALS.category)
                  }))
                : []
        };
    }

    normalizeWallet(wallet) {
        const visual = normalizeVisual(wallet, DEFAULT_VISUALS.wallet);
        return {
            ...wallet,
            id: Number(wallet.id),
            totalIncome: Number(wallet.totalIncome),
            totalExpense: Number(wallet.totalExpense),
            balance: Number(wallet.balance),
            icon: visual.icon,
            color: visual.color
        };
    }

    normalizeCategory(category) {
        const visual = normalizeVisual(category, DEFAULT_VISUALS.category);
        return {
            ...category,
            id: Number(category.id),
            icon: visual.icon,
            color: visual.color
        };
    }

    normalizeGoal(goal) {
        const visual = normalizeVisual(goal, DEFAULT_VISUALS.goal);
        return {
            ...goal,
            id: Number(goal.id),
            walletId: Number(goal.walletId),
            targetAmount: Number(goal.targetAmount),
            intervalDays: Number(goal.intervalDays),
            progressAmount: Number(goal.progressAmount ?? 0),
            progressPercentage: Number(goal.progressPercentage ?? 0),
            remainingAmount: Number(goal.remainingAmount ?? 0),
            status: goal.status ?? 'in_progress',
            currentPeriodStart: goal.currentPeriodStart,
            currentPeriodEnd: goal.currentPeriodEnd,
            type: goal.type,
            icon: visual.icon,
            color: visual.color
        };
    }

    async loadWallets({ preserveActive = true } = {}) {
        const wallets = await fetchWallets();
        this.wallets = wallets.map((wallet) => this.normalizeWallet(wallet));

        const walletIds = this.wallets.map((wallet) => wallet.id);

        if (!preserveActive || !this.activeWalletId || !walletIds.includes(this.activeWalletId)) {
            this.activeWalletId = this.wallets[0]?.id ?? null;
        }

        // Atualizar o seletor de carteiras
        this.walletSelectorManager.updateWallets(this.wallets, this.activeWalletId);
        this.renderWallets();
    }

    async refreshWallets() {
        await this.loadWallets({ preserveActive: true });
    }

    async loadCategories() {
        const categories = await fetchCategories();
        this.categories = categories.map((category) => this.normalizeCategory(category));
        this.renderCategories();
    }

    async refreshCategories() {
        await this.loadCategories();
    }

    async loadGoals() {
        if (!this.activeWalletId) {
            this.goals = [];
            this.renderGoals();
            return;
        }

        const goals = await fetchGoals(this.activeWalletId);
        this.goals = goals.map((goal) => this.normalizeGoal(goal));
        this.renderGoals();
    }

    async refreshGoals() {
        await this.loadGoals();
    }

    calculateBalance() {
        return this.transactions.reduce((total, transaction) => {
            return transaction.type === 'income' ? total + transaction.amount : total - transaction.amount;
        }, 0);
    }

    calculateTotalIncome() {
        return this.transactions
            .filter((transaction) => transaction.type === 'income')
            .reduce((total, transaction) => total + transaction.amount, 0);
    }

    calculateTotalExpense() {
        return this.transactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((total, transaction) => total + transaction.amount, 0);
    }

    renderBalance() {
        const balanceContainer = document.getElementById('balance-card');
        if (!balanceContainer) {
            return;
        }

        const balance = this.calculateBalance();
        const totalIncome = this.calculateTotalIncome();
        const totalExpense = this.calculateTotalExpense();

        this.templates.renderBalance(balanceContainer, {
            balance,
            totalIncome,
            totalExpense
        });
    }

    renderTransactionsList() {
        const transactionsContainer = document.getElementById('transactions-list');
        if (!transactionsContainer) {
            return;
        }

        if (this.transactions.length === 0) {
            this.templates.renderEmptyState(transactionsContainer);
            return;
        }

        this.templates.renderTransactionsList(transactionsContainer, this.transactions);
    }

    updateDisplay() {
        this.renderCategories();
        this.renderWallets();
        this.renderGoals();
        this.renderBalance();
        this.renderTransactionsList();
        this.updateDashboardIfVisible();
    }

    renderWallets() {
        const walletsContainer = document.getElementById('wallets-list');
        if (!walletsContainer) {
            return;
        }

        this.templates.renderWalletsList(walletsContainer, this.wallets, this.activeWalletId);
    }

    renderCategories() {
        const categoriesContainer = document.getElementById('categories-list');
        if (!categoriesContainer) {
            return;
        }

        this.templates.renderCategoriesList(categoriesContainer, this.categories);
    }

    renderGoals() {
        const goalsContainer = document.getElementById('goals-list');
        if (!goalsContainer) {
            return;
        }

        this.templates.renderGoalsList(
            goalsContainer,
            this.goals,
            this.templates.formatCurrency.bind(this.templates),
            this.templates.formatDate.bind(this.templates)
        );
    }

    getCategoriesByType(type) {
        if (!['income', 'expense'].includes(type)) {
            return [];
        }

        return this.categories.filter((category) => category.type === type);
    }

    setupEventListeners() {
        document.addEventListener('click', async (event) => {
            const categoryModalTrigger = event.target.closest('[data-open-modal="category"]');
            if (categoryModalTrigger) {
                event.preventDefault();
                this.openCategoryModal();
                return;
            }

            const walletModalTrigger = event.target.closest('[data-open-modal="wallet"]');
            if (walletModalTrigger) {
                event.preventDefault();
                this.openWalletModal();
                return;
            }

            const goalModalTrigger = event.target.closest('[data-open-modal="goal"]');
            if (goalModalTrigger) {
                event.preventDefault();
                this.openGoalModal();
                return;
            }

            const transactionModalTrigger = event.target.closest('[data-open-modal="transaction"]');
            if (transactionModalTrigger) {
                event.preventDefault();
                this.openTransactionModal();
                return;
            }

            const editTransactionBtn = event.target.closest('[data-edit-transaction]');
            if (editTransactionBtn) {
                event.preventDefault();
                const id = Number(editTransactionBtn.dataset.id);
                this.openTransactionModalForEdit(id);
                return;
            }

            const deleteWalletBtn = event.target.closest('[data-delete-wallet]');
            if (deleteWalletBtn) {
                event.preventDefault();
                const id = Number(deleteWalletBtn.dataset.walletId);
                await this.handleDeleteWallet(id);
                return;
            }

            const editWalletBtn = event.target.closest('[data-edit-wallet]');
            if (editWalletBtn) {
                event.preventDefault();
                const id = Number(editWalletBtn.dataset.walletId);
                this.openWalletModalForEdit(id);
                return;
            }

            const walletButton = event.target.closest('[data-wallet]');
            if (walletButton) {
                event.preventDefault();
                const walletId = Number(walletButton.dataset.walletId);
                await this.handleWalletSelection(walletId);
                return;
            }

            // Botão de remoção de transação (usava classe .btn-remove, mas o template fornece apenas data-remove)
            const removeButton = event.target.closest('[data-remove]');
            if (removeButton) {
                event.preventDefault();
                const transactionId = Number(removeButton.dataset.id);
                await this.handleDeleteTransaction(transactionId);
                return; // Evita processamento adicional no mesmo clique
            }

            const editCategoryBtn = event.target.closest('[data-edit-category]');
            if (editCategoryBtn) {
                event.preventDefault();
                const categoryId = Number(editCategoryBtn.closest('[data-category]')?.dataset.categoryId);
                this.openCategoryModalForEdit(categoryId);
                return;
            }

            const deleteCategoryBtn = event.target.closest('[data-delete-category]');
            if (deleteCategoryBtn) {
                event.preventDefault();
                const categoryId = Number(deleteCategoryBtn.closest('[data-category]')?.dataset.categoryId);
                await this.handleDeleteCategory(categoryId);
                return;
            }

            const editGoalBtn = event.target.closest('[data-edit-goal]');
            if (editGoalBtn) {
                event.preventDefault();
                const goalId = Number(editGoalBtn.closest('[data-goal]')?.dataset.goalId);
                this.openGoalModalForEdit(goalId);
                return;
            }

            const deleteGoalBtn = event.target.closest('[data-delete-goal]');
            if (deleteGoalBtn) {
                event.preventDefault();
                const goalId = Number(deleteGoalBtn.closest('[data-goal]')?.dataset.goalId);
                await this.handleDeleteGoal(goalId);
                return;
            }
        });

        document.addEventListener('submit', async (event) => {
            if (event.target.id === 'transaction-form') {
                event.preventDefault();
                await this.handleFormSubmit(event.target);
            }

            if (event.target.id === 'wallet-form') {
                event.preventDefault();
                await this.handleWalletFormSubmit(event.target);
            }

            if (event.target.id === 'category-form') {
                event.preventDefault();
                await this.handleCategoryFormSubmit(event.target);
            }

            if (event.target.id === 'goal-form') {
                event.preventDefault();
                await this.handleGoalFormSubmit(event.target);
            }
        });
    }

    openTransactionModal() {
        if (!this.activeWalletId) {
            alert('Selecione uma carteira antes de criar transações.');
            return;
        }
        
        const form = this.templates.createTransactionForm();
        this.modalManager.open({
            title: 'Nova Transação',
            content: form,
            onClose: () => this.iconPicker.close()
        });
        this.setupTransactionFormInteractions(form);
    }

    openTransactionModalForEdit(id) {
        const transaction = this.transactions.find((t) => t.id === id);
        if (!transaction) return;
        const form = this.templates.createTransactionForm();
        form.dataset.mode = 'edit';
        form.dataset.transactionId = String(id);
        if (transaction.walletId) {
            form.dataset.walletId = String(transaction.walletId);
        }
        form.querySelector('[name="description"]').value = transaction.description;
        form.querySelector('[name="amount"]').value = String(transaction.amount);
        // Hidden input já está presente; será atualizado após setupTransactionFormInteractions
        const hiddenType = form.querySelector('input[name="type"]');
        if (hiddenType) hiddenType.value = transaction.type;
        form.querySelector('[name="date"]').value = transaction.date;
        this.modalManager.open({
            title: 'Editar Transação',
            content: form,
            onClose: () => this.iconPicker.close()
        });
        this.setupTransactionFormInteractions(form);
        const categoriesContainer = form.querySelector('[data-category-options]');
        if (categoriesContainer) {
            const selectedIds = transaction.categories.map((c) => c.id);
            const categoriesForType = this.getCategoriesByType(transaction.type);
            this.templates.renderCategoryOptions(categoriesContainer, categoriesForType, selectedIds);
        }
    }

    openWalletModal() {
        this.iconPicker.close();
        const form = this.templates.createWalletForm();
        const { setVisual } = this.setupVisualCustomizer(form, DEFAULT_VISUALS.wallet);
        setVisual(DEFAULT_VISUALS.wallet);
        this.modalManager.open({
            title: 'Nova Carteira',
            content: form,
            onClose: () => this.iconPicker.close()
        });
    }

    openWalletModalForEdit(id) {
        const wallet = this.wallets.find((w) => w.id === id);
        if (!wallet) return;
        this.iconPicker.close();
        const form = this.templates.createWalletForm();
        const { setVisual } = this.setupVisualCustomizer(form, DEFAULT_VISUALS.wallet);
        this.templates.fillWalletForm(form, wallet);
        form.dataset.mode = 'edit';
        form.dataset.walletId = String(id);
        this.modalManager.open({
            title: 'Editar Carteira',
            content: form,
            onClose: () => this.iconPicker.close()
        });
        setVisual({ icon: wallet.icon, color: wallet.color });
    }

    openCategoryModal() {
        this.iconPicker.close();
        const form = this.templates.createCategoryForm();
        const { setVisual } = this.setupVisualCustomizer(form, DEFAULT_VISUALS.category);
        setVisual(DEFAULT_VISUALS.category);
        this.modalManager.open({
            title: 'Nova Categoria',
            content: form,
            onClose: () => this.iconPicker.close()
        });
    }

    openCategoryModalForEdit(id) {
        const category = this.categories.find((c) => c.id === id);
        if (!category) return;
        this.iconPicker.close();
        const form = this.templates.createCategoryForm();
        const { setVisual } = this.setupVisualCustomizer(form, DEFAULT_VISUALS.category);
        this.templates.fillCategoryForm(form, category);
        form.dataset.mode = 'edit';
        form.dataset.categoryId = String(id);
        this.modalManager.open({
            title: 'Editar Categoria',
            content: form,
            onClose: () => this.iconPicker.close()
        });
        setVisual({ icon: category.icon, color: category.color });
    }

    openGoalModal() {
        if (!this.activeWalletId) {
            alert('Selecione uma carteira antes de definir metas.');
            return;
        }

        const activeWallet = this.wallets.find((wallet) => wallet.id === this.activeWalletId);
        this.iconPicker.close();
        const form = this.templates.createGoalForm({ walletName: activeWallet?.name ?? '' });
        const { setVisual } = this.setupVisualCustomizer(form, DEFAULT_VISUALS.goal);
        setVisual(DEFAULT_VISUALS.goal);

        this.modalManager.open({
            title: 'Nova Meta',
            content: form,
            onClose: () => this.iconPicker.close()
        });

        const nameInput = form.querySelector('[name="name"]');
        nameInput?.focus();
    }

    openGoalModalForEdit(id) {
        const goal = this.goals.find((g) => g.id === id);
        if (!goal) return;
        const activeWallet = this.wallets.find((wallet) => wallet.id === this.activeWalletId);
        this.iconPicker.close();
        const form = this.templates.createGoalForm({ walletName: activeWallet?.name ?? '' });
        const { setVisual } = this.setupVisualCustomizer(form, DEFAULT_VISUALS.goal);
        this.templates.fillGoalForm(form, goal);
        form.dataset.mode = 'edit';
        form.dataset.goalId = String(id);
        this.modalManager.open({
            title: 'Editar Meta',
            content: form,
            onClose: () => this.iconPicker.close()
        });
        setVisual({ icon: goal.icon, color: goal.color });
    }

    setupTransactionFormInteractions(form) {
        const hiddenTypeInput = form.querySelector('input[name="type"]');
        const chooseBar = form.querySelector('[data-transaction-type-choose]');
        const categoriesContainer = form.querySelector('[data-category-options]');

        if (!hiddenTypeInput || !chooseBar || !categoriesContainer) return;

        const setActiveType = (type) => {
            hiddenTypeInput.value = type;
            chooseBar.querySelectorAll('[data-type-option]').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.typeOption === type);
            });
            renderOptions();
            const submitBtn = form.querySelector('[data-transaction-submit]');
            if (submitBtn) {
                submitBtn.classList.toggle('btn-income', type === 'income');
                submitBtn.classList.toggle('btn-expense', type === 'expense');
            }
        };

        const renderOptions = () => {
            const type = hiddenTypeInput.value;
            if (!type || !['income', 'expense'].includes(type)) {
                categoriesContainer.innerHTML = '';
                const info = document.createElement('div');
                info.className = 'category-options-empty';
                info.textContent = 'Selecione o tipo da transação para ver as categorias disponíveis.';
                categoriesContainer.appendChild(info);
                return;
            }
            const selectedIds = Array.from(categoriesContainer.querySelectorAll('input[name="categories"]:checked'))
                .map((input) => Number(input.value))
                .filter((value) => Number.isInteger(value) && value > 0);
            const categoriesForType = this.getCategoriesByType(type);
            this.templates.renderCategoryOptions(categoriesContainer, categoriesForType, selectedIds);
        };

        chooseBar.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-type-option]');
            if (!btn) return;
            const newType = btn.dataset.typeOption;
            if (newType && newType !== hiddenTypeInput.value) {
                setActiveType(newType);
            }
        });

        // Estado inicial padrão: income
        setActiveType(hiddenTypeInput.value || 'income');
    }

    async handleFormSubmit(form) {
        const isEdit = form.dataset.mode === 'edit';
        if (!isEdit && !this.activeWalletId) {
            alert('Crie ou selecione uma carteira antes de adicionar transações.');
            return;
        }

        const formData = new FormData(form);
        const selectedCategoryIds = Array.from(form.querySelectorAll('input[name="categories"]:checked'))
            .map((input) => Number(input.value))
            .filter((value) => Number.isInteger(value) && value > 0);

        const data = {
            description: formData.get('description')?.toString().trim(),
            amount: formData.get('amount'),
            type: formData.get('type'),
            date: formData.get('date'),
            walletId: this.activeWalletId,
            categories: selectedCategoryIds
        };

        const errors = [];
        if (!data.description) {
            errors.push('Descrição é obrigatória.');
        }

        const numericAmount = Number(data.amount);
        if (Number.isNaN(numericAmount) || numericAmount <= 0) {
            errors.push('Valor deve ser maior que zero.');
        }

        if (!['income', 'expense'].includes(data.type)) {
            errors.push('Selecione o tipo da transação.');
        }

        if (!data.date || Number.isNaN(Date.parse(data.date))) {
            errors.push('Informe uma data válida.');
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        try {
            if (isEdit) {
                const id = Number(form.dataset.transactionId);
                const original = this.transactions.find((t) => t.id === id);
                const fromForm = Number(form.dataset.walletId);
                const walletIdForEdit = Number.isInteger(fromForm) && fromForm > 0
                    ? fromForm
                    : (original?.walletId ?? this.activeWalletId);

                if (!Number.isInteger(walletIdForEdit) || walletIdForEdit <= 0) {
                    alert('Carteira inválida para atualizar esta transação.');
                    return;
                }
                const updated = await updateTransaction(id, {
                    description: data.description,
                    amount: numericAmount,
                    type: data.type,
                    date: data.date,
                    categories: data.categories,
                    walletId: walletIdForEdit
                });
                const normalized = this.normalizeTransaction(updated);
                this.transactions = this.transactions.map((t) => (t.id === id ? normalized : t));
            } else {
                const transaction = await createTransaction({
                    ...data,
                    amount: numericAmount
                });
                this.transactions.unshift(this.normalizeTransaction(transaction));
            }

            try {
                await this.refreshWallets();
            } catch (refreshError) {
                console.error('Erro ao atualizar carteiras após salvar transação:', refreshError);
            }
            try {
                await this.refreshGoals();
            } catch (refreshError) {
                console.error('Erro ao atualizar metas após salvar transação:', refreshError);
            }
            this.updateDisplay();
            this.closeModals();
        } catch (error) {
            console.error('Erro ao criar transação:', error);
            alert(error.message || 'Não foi possível salvar a transação.');
        }
    }

    async handleDeleteTransaction(id) {
        if (!this.activeWalletId) {
            alert('Selecione uma carteira válida.');
            return;
        }

        if (!Number.isInteger(id) || id <= 0) {
            alert('Transação inválida.');
            return;
        }

        try {
            await deleteTransaction(id, this.activeWalletId);
            this.transactions = this.transactions.filter((transaction) => transaction.id !== id);
            try {
                await this.refreshWallets();
            } catch (refreshError) {
                console.error('Erro ao atualizar carteiras após excluir transação:', refreshError);
            }
            try {
                await this.refreshGoals();
            } catch (refreshError) {
                console.error('Erro ao atualizar metas após excluir transação:', refreshError);
            }
            this.updateDisplay();
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            alert(error.message || 'Não foi possível excluir a transação.');
        }
    }

    async handleWalletSelection(walletId) {
        if (!Number.isInteger(walletId) || walletId <= 0 || walletId === this.activeWalletId) {
            return;
        }

        this.activeWalletId = walletId;
        this.renderWallets();

        try {
            await this.loadTransactions();
            await this.loadGoals();
            this.updateDisplay();
        } catch (error) {
            console.error('Erro ao trocar carteira:', error);
            alert(error.message || 'Não foi possível carregar as transações desta carteira.');
        }
    }

    async handleWalletFormSubmit(form) {
        const formData = new FormData(form);
        const name = formData.get('name')?.toString().trim();
        const descriptionRaw = formData.get('description')?.toString().trim();
        const description = descriptionRaw ? descriptionRaw : null;
        const icon = formData.get('icon')?.toString().trim();
        const color = formData.get('color')?.toString().trim();

        const errors = [];
        if (!name) {
            errors.push('Nome da carteira é obrigatório.');
        }

        if (!icon) {
            errors.push('Selecione um ícone para a carteira.');
        }

        if (!HEX_PATTERN.test(color ?? '')) {
            errors.push('Informe uma cor hexadecimal válida para a carteira.');
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        try {
            const isEdit = form.dataset.mode === 'edit';
            if (isEdit) {
                const id = Number(form.dataset.walletId);
                const wallet = await updateWallet(id, { name, description, icon, color: normalizeHexColor(color, DEFAULT_VISUALS.wallet.color) });
                this.closeModals();
                await this.loadWallets({ preserveActive: true });
                if (this.activeWalletId === id) {
                    await this.loadTransactions();
                    await this.loadGoals();
                }
            } else {
                const wallet = await createWallet({ name, description, icon, color: normalizeHexColor(color, DEFAULT_VISUALS.wallet.color) });
                this.activeWalletId = Number(wallet.id);
                this.closeModals();
                await this.loadWallets();
                await this.loadTransactions();
                await this.loadGoals();
            }
            this.updateDisplay();
        } catch (error) {
            console.error('Erro ao criar carteira:', error);
            alert(error.message || 'Não foi possível criar a carteira.');
        }
    }

    async handleDeleteWallet(id) {
        if (!Number.isInteger(id) || id <= 0) return;
        if (this.wallets.length <= 1) {
            alert('Você não pode excluir a única carteira. Crie outra antes de excluir esta.');
            return;
        }
        if (!confirm('Tem certeza que deseja excluir esta carteira? Todas as transações e metas associadas serão removidas.')) {
            return;
        }
        try {
            await deleteWallet(id);
            await this.loadWallets({ preserveActive: true });
            if (this.activeWalletId === id) {
                // Seleciona primeira carteira restante (garantido existir porque impedimos remover a última)
                this.activeWalletId = this.wallets[0]?.id ?? null;
                await this.loadTransactions();
                await this.loadGoals();
            }
            this.updateDisplay();
        } catch (error) {
            console.error('Erro ao excluir carteira:', error);
            alert(error.message || 'Não foi possível excluir a carteira.');
        }
    }

    async handleGoalFormSubmit(form) {
        if (!this.activeWalletId) {
            alert('Selecione uma carteira válida antes de salvar uma meta.');
            return;
        }

        const formData = new FormData(form);
        const rawName = formData.get('name');
        const rawType = formData.get('type');
        const rawTargetAmount = formData.get('targetAmount');
        const rawStartDate = formData.get('startDate');
        const rawIntervalDays = formData.get('intervalDays');
        const icon = formData.get('icon')?.toString().trim();
        const color = formData.get('color')?.toString().trim();

        const name = typeof rawName === 'string' ? rawName.trim() : '';
        const type = typeof rawType === 'string' ? rawType.trim() : '';
        const targetAmount = Number(rawTargetAmount);
        const startDate = typeof rawStartDate === 'string' ? rawStartDate.trim() : '';
        const intervalDays = Number(rawIntervalDays);

        const errors = [];

        if (!name) {
            errors.push('Nome da meta é obrigatório.');
        }

        if (!['income', 'expense'].includes(type)) {
            errors.push('Selecione o tipo da meta.');
        }

        if (Number.isNaN(targetAmount) || targetAmount <= 0) {
            errors.push('Valor alvo deve ser maior que zero.');
        }

        if (!startDate || Number.isNaN(Date.parse(startDate))) {
            errors.push('Informe uma data inicial válida.');
        }

        if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
            errors.push('Informe um intervalo de renovação em dias (inteiro maior que zero).');
        }

        if (!icon) {
            errors.push('Selecione um ícone para a meta.');
        }

        if (!HEX_PATTERN.test(color ?? '')) {
            errors.push('Informe uma cor hexadecimal válida para a meta.');
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        try {
            const isEdit = form.dataset.mode === 'edit';
            if (isEdit) {
                const id = Number(form.dataset.goalId);
                const goal = await updateGoal(id, {
                    walletId: this.activeWalletId,
                    name,
                    type,
                    targetAmount,
                    startDate,
                    intervalDays,
                    icon,
                    color: normalizeHexColor(color, DEFAULT_VISUALS.goal.color)
                });
                const normalized = this.normalizeGoal(goal);
                this.goals = this.goals.map((g) => (g.id === id ? normalized : g));
                this.renderGoals();
                this.closeModals();
            } else {
                const goal = await createGoal({
                    walletId: this.activeWalletId,
                    name,
                    type,
                    targetAmount,
                    startDate,
                    intervalDays,
                    icon,
                    color: normalizeHexColor(color, DEFAULT_VISUALS.goal.color)
                });

                const normalizedGoal = this.normalizeGoal(goal);
                this.goals = [normalizedGoal, ...this.goals];
                this.renderGoals();
                this.closeModals();
            }
        } catch (error) {
            console.error('Erro ao criar meta:', error);
            alert(error.message || 'Não foi possível criar a meta.');
        }
    }

    async handleDeleteGoal(id) {
        if (!Number.isInteger(id) || id <= 0) return;
        if (!this.activeWalletId) {
            alert('Selecione uma carteira válida.');
            return;
        }
        if (!confirm('Excluir esta meta?')) return;
        try {
            await deleteGoal(id, this.activeWalletId);
            this.goals = this.goals.filter((g) => g.id !== id);
            this.renderGoals();
        } catch (error) {
            console.error('Erro ao excluir meta:', error);
            alert(error.message || 'Não foi possível excluir a meta.');
        }
    }

    async handleCategoryFormSubmit(form) {
        const formData = new FormData(form);
        const name = formData.get('name')?.toString().trim();
        const type = formData.get('type')?.toString();
        const icon = formData.get('icon')?.toString().trim();
        const color = formData.get('color')?.toString().trim();

        const errors = [];

        if (!name) {
            errors.push('Nome da categoria é obrigatório.');
        }

        if (!['income', 'expense'].includes(type)) {
            errors.push('Selecione o tipo da categoria.');
        }

        if (!icon) {
            errors.push('Selecione um ícone para a categoria.');
        }

        if (!HEX_PATTERN.test(color ?? '')) {
            errors.push('Informe uma cor hexadecimal válida para a categoria.');
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        try {
            const isEdit = form.dataset.mode === 'edit';
            if (isEdit) {
                const id = Number(form.dataset.categoryId);
                await updateCategory(id, { name, type, icon, color: normalizeHexColor(color, DEFAULT_VISUALS.category.color) });
            } else {
                await createCategory({ name, type, icon, color: normalizeHexColor(color, DEFAULT_VISUALS.category.color) });
            }
            this.closeModals();
            await this.refreshCategories();
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            alert(error.message || 'Não foi possível criar a categoria.');
        }
    }

    async handleDeleteCategory(id) {
        if (!Number.isInteger(id) || id <= 0) return;
        if (!confirm('Excluir esta categoria? Transações antigas manterão o vínculo mas você não poderá usá-la novamente.')) return;
        try {
            await deleteCategory(id);
            await this.refreshCategories();
        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            alert(error.message || 'Não foi possível excluir a categoria.');
        }
    }

    // === MÉTODOS PARA NAVEGAÇÃO === //

    setupNavigationListeners() {
        // Escutar mudanças de página
        document.addEventListener('page-changed', (event) => {
            const { currentPage } = event.detail;
            this.onPageChanged(currentPage);
        });
    }

    onPageChanged(page) {
        // Aguardar o DOM ser atualizado antes de renderizar
        requestAnimationFrame(() => {
            if (page === 'dashboard') {
                this.dashboardManager.onDashboardLoaded();
            } else {
                // Para outras páginas, renderizar normalmente
                this.updateDisplay();
            }
            // Sempre verificar o aviso de carteira ao mudar de página
            this.updateWalletRequiredWarning();
        });
    }

    updateDashboardIfVisible() {
        if (this.navigationManager.getCurrentPage() === 'dashboard') {
            this.dashboardManager.updateDashboard();
        }
        this.updateWalletRequiredWarning();
    }

    updateWalletRequiredWarning() {
        const warningElement = document.getElementById('wallet-required-warning');
        if (!warningElement) return;

        if (!this.activeWalletId || this.wallets.length === 0) {
            warningElement.style.display = 'block';
            this.disableUserInteraction();
        } else {
            warningElement.style.display = 'none';
            this.enableUserInteraction();
        }
    }

    disableUserInteraction() {
        // Desabilitar botões de adicionar transação/meta que requerem carteira
        const transactionButtons = document.querySelectorAll('[data-open-modal="transaction"]');
        const goalButtons = document.querySelectorAll('[data-open-modal="goal"]');
        
        [...transactionButtons, ...goalButtons].forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    enableUserInteraction() {
        // Reabilitar botões
        const transactionButtons = document.querySelectorAll('[data-open-modal="transaction"]');
        const goalButtons = document.querySelectorAll('[data-open-modal="goal"]');
        
        [...transactionButtons, ...goalButtons].forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }

    handleWalletSelectionFromSelector(walletId) {
        // Método chamado quando o usuário seleciona uma carteira no navbar
        this.handleWalletSelection(walletId);
    }

    async handleWalletSelection(walletId) {
        if (!Number.isInteger(walletId) || walletId <= 0 || walletId === this.activeWalletId) {
            return;
        }

        this.activeWalletId = walletId;
        
        // Sincronizar com o seletor de carteiras
        this.walletSelectorManager.forceSelectWallet(walletId);
        
        this.renderWallets();

        try {
            await this.loadTransactions();
            await this.loadGoals();
            this.updateDisplay();
        } catch (error) {
            console.error('Erro ao trocar carteira:', error);
            alert(error.message || 'Não foi possível carregar as transações desta carteira.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FinancialControl();
});
