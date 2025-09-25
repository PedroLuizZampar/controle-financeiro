export class DashboardManager {
    constructor(financialControl) {
        this.financialControl = financialControl;
        this.statsElements = {
            wallets: document.getElementById('stat-wallets'),
            categories: document.getElementById('stat-categories'),
            transactions: document.getElementById('stat-transactions')
        };
    }

    updateDashboard() {
        this.updateStats();
        this.updateDashboardBalance();
        this.updateDashboardTransactions();
        this.updateDashboardGoals();
    }

    updateStats() {
        // Estatísticas básicas
        if (this.statsElements.wallets) {
            this.statsElements.wallets.textContent = this.financialControl.wallets.length;
        }
        
        if (this.statsElements.categories) {
            this.statsElements.categories.textContent = this.financialControl.categories.length;
        }
        
        if (this.statsElements.transactions) {
            // Contar transações do mês atual
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const monthTransactions = this.financialControl.transactions.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return transactionDate.getMonth() === currentMonth && 
                       transactionDate.getFullYear() === currentYear;
            });
            
            this.statsElements.transactions.textContent = monthTransactions.length;
        }
    }

    updateDashboardBalance() {
        const balanceContainer = document.getElementById('dashboard-balance-card');
        if (!balanceContainer) return;

        // Usar o mesmo método do TemplateManager para manter consistência
        const balance = this.financialControl.calculateBalance();
        const totalIncome = this.financialControl.calculateTotalIncome();
        const totalExpense = this.financialControl.calculateTotalExpense();

        this.financialControl.templates.renderBalance(balanceContainer, {
            balance,
            totalIncome,
            totalExpense
        });
    }

    updateDashboardTransactions() {
        const transactionsContainer = document.getElementById('dashboard-transactions-list');
        if (!transactionsContainer) return;

        // Mostrar apenas as 5 transações mais recentes
        const recentTransactions = this.financialControl.transactions.slice(0, 5);
        
        if (recentTransactions.length === 0) {
            this.financialControl.templates.renderEmptyState(transactionsContainer);
            return;
        }

        this.financialControl.templates.renderTransactionsList(transactionsContainer, recentTransactions);
    }

    updateDashboardGoals() {
        const goalsContainer = document.getElementById('dashboard-goals-list');
        if (!goalsContainer) return;

        // Mostrar apenas metas em andamento (não concluídas)
        const activeGoals = this.financialControl.goals.filter(goal => goal.status !== 'achieved');
        
        if (activeGoals.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'goals-empty';
            empty.textContent = this.financialControl.activeWalletId 
                ? 'Nenhuma meta ativa para esta carteira.'
                : 'Selecione uma carteira para ver as metas.';
            goalsContainer.innerHTML = '';
            goalsContainer.appendChild(empty);
            return;
        }

        this.financialControl.templates.renderGoalsList(
            goalsContainer,
            activeGoals,
            this.financialControl.templates.formatCurrency.bind(this.financialControl.templates),
            this.financialControl.templates.formatDate.bind(this.financialControl.templates)
        );
    }

    // Método para ser chamado quando a página de dashboard é carregada
    onDashboardLoaded() {
        // Aguardar um frame para garantir que o DOM foi atualizado
        requestAnimationFrame(() => {
            this.statsElements = {
                wallets: document.getElementById('stat-wallets'),
                categories: document.getElementById('stat-categories'),
                transactions: document.getElementById('stat-transactions')
            };
            this.updateDashboard();
        });
    }
}