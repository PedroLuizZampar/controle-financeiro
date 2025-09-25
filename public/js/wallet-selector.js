export class WalletSelectorManager {
    constructor(onWalletChange) {
        this.wallets = [];
        this.activeWalletId = null;
        this.onWalletChange = onWalletChange;
        this.selectorElement = document.getElementById('wallet-selector');
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.selectorElement) {
            this.selectorElement.addEventListener('change', (event) => {
                const walletId = event.target.value ? Number(event.target.value) : null;
                this.selectWallet(walletId);
            });
        }
    }

    updateWallets(wallets, activeWalletId = null) {
        this.wallets = wallets;
        
        // Se não foi especificado um ID ativo, mantém o atual ou usa o primeiro disponível
        if (activeWalletId !== null) {
            this.activeWalletId = activeWalletId;
        } else if (!this.activeWalletId && wallets.length > 0) {
            this.activeWalletId = wallets[0].id;
        }
        
        this.renderSelector();
    }

    renderSelector() {
        if (!this.selectorElement) return;

        // Limpar opções existentes
        this.selectorElement.innerHTML = '';

        // Opção padrão
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = this.wallets.length === 0 
            ? 'Nenhuma carteira cadastrada' 
            : 'Selecione uma carteira';
        this.selectorElement.appendChild(defaultOption);

        // Adicionar carteiras
        this.wallets.forEach(wallet => {
            const option = document.createElement('option');
            option.value = wallet.id;
            option.textContent = `${wallet.name} (${this.formatCurrency(wallet.balance)})`;
            
            if (wallet.id === this.activeWalletId) {
                option.selected = true;
            }
            
            this.selectorElement.appendChild(option);
        });

        // Se não há carteiras, desabilitar o selector
        this.selectorElement.disabled = this.wallets.length === 0;
    }

    selectWallet(walletId) {
        const previousWalletId = this.activeWalletId;
        this.activeWalletId = walletId;
        
        // Atualizar visual do selector
        this.selectorElement.value = walletId || '';
        
        // Notificar mudança
        if (this.onWalletChange && walletId !== previousWalletId) {
            this.onWalletChange(walletId, previousWalletId);
        }
    }

    getActiveWallet() {
        return this.wallets.find(wallet => wallet.id === this.activeWalletId) || null;
    }

    getActiveWalletId() {
        return this.activeWalletId;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value ?? 0);
    }

    // Método para forçar seleção de carteira (usado pelo app principal)
    forceSelectWallet(walletId) {
        this.activeWalletId = walletId;
        if (this.selectorElement) {
            this.selectorElement.value = walletId || '';
        }
    }
}