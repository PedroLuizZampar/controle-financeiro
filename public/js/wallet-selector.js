const HEX_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const DEFAULT_WALLET_VISUAL = {
    icon: 'fa-solid fa-wallet',
    color: '#22c55e'
};

function normalizeHexColor(hex, fallback = DEFAULT_WALLET_VISUAL.color) {
    if (typeof hex !== 'string') {
        return fallback;
    }
    const value = hex.trim();
    return HEX_PATTERN.test(value) ? value : fallback;
}

function getContrastColor(hex) {
    const normalized = normalizeHexColor(hex, '#ffffff');
    const base = normalized.length >= 7 ? normalized.slice(0, 7) : normalized;
    const r = parseInt(base.slice(1, 3), 16) / 255;
    const g = parseInt(base.slice(3, 5), 16) / 255;
    const b = parseInt(base.slice(5, 7), 16) / 255;
    const srgb = [r, g, b].map((value) => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
    const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return luminance > 0.6 ? '#0f172a' : '#f8fafc';
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value ?? 0);
}

export class WalletSelectorManager {
    constructor(onWalletChange) {
        this.wallets = [];
        this.activeWalletId = null;
        this.onWalletChange = onWalletChange;

        this.selectorElement = document.getElementById('wallet-selector');
        this.wrapper = document.querySelector('[data-wallet-selector]');
        this.triggerElement = this.wrapper?.querySelector('[data-wallet-selector-trigger]');
        this.dropdownElement = this.wrapper?.querySelector('[data-wallet-selector-dropdown]');
        this.listElement = this.wrapper?.querySelector('[data-wallet-selector-list]');
        this.emptyElement = this.wrapper?.querySelector('[data-wallet-selector-empty]');
        this.previewElement = this.wrapper?.querySelector('[data-wallet-selector-preview]');
        this.iconElement = this.wrapper?.querySelector('[data-wallet-selector-icon]');
        this.nameElement = this.wrapper?.querySelector('[data-wallet-selector-name]');
        this.metaElement = this.wrapper?.querySelector('[data-wallet-selector-meta]');
        this.createButton = this.wrapper?.querySelector('[data-wallet-selector-create]');

        this.isOpen = false;

        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderSelector();
    }

    setupEventListeners() {
        if (this.selectorElement) {
            this.selectorElement.addEventListener('change', (event) => {
                const walletId = event.target.value ? Number(event.target.value) : null;
                this.selectWallet(walletId);
            });
        }

        if (this.triggerElement) {
            this.triggerElement.addEventListener('click', (event) => {
                event.preventDefault();
                if (this.triggerElement.disabled) {
                    return;
                }
                this.toggleDropdown();
            });

            this.triggerElement.addEventListener('keydown', (event) => {
                if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
                    event.preventDefault();
                    if (!this.triggerElement.disabled) {
                        this.openDropdown();
                    }
                }
            });
        }

        if (this.createButton) {
            this.createButton.addEventListener('click', () => {
                this.closeDropdown({ returnFocus: false });
            });
        }
    }

    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        if (!this.dropdownElement || this.wallets.length === 0) {
            return;
        }

        this.dropdownElement.hidden = false;
        requestAnimationFrame(() => this.dropdownElement.classList.add('is-open'));
        this.triggerElement?.setAttribute('aria-expanded', 'true');
        this.isOpen = true;

        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleKeyDown);

        requestAnimationFrame(() => {
            const activeOption = this.listElement?.querySelector('.wallet-selector-option.is-active');
            const firstOption = this.listElement?.querySelector('.wallet-selector-option');
            const target = activeOption || firstOption;
            target?.focus({ preventScroll: true });
        });
    }

    closeDropdown({ returnFocus = true } = {}) {
        if (!this.dropdownElement) {
            this.isOpen = false;
            return;
        }

        this.dropdownElement.classList.remove('is-open');
        this.dropdownElement.hidden = true;

        if (this.triggerElement) {
            this.triggerElement.setAttribute('aria-expanded', 'false');
            if (returnFocus) {
                this.triggerElement.focus({ preventScroll: true });
            }
        }

        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        this.isOpen = false;
    }

    handleDocumentClick(event) {
        if (!this.wrapper) {
            return;
        }

        if (!this.wrapper.contains(event.target)) {
            this.closeDropdown();
        }
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.closeDropdown();
        }
    }

    updateWallets(wallets, activeWalletId = null) {
        this.wallets = Array.isArray(wallets) ? wallets : [];

        if (activeWalletId !== null) {
            this.activeWalletId = activeWalletId;
        } else if (!this.activeWalletId && this.wallets.length > 0) {
            this.activeWalletId = this.wallets[0].id;
        }

        if (this.activeWalletId && !this.wallets.some((wallet) => wallet.id === this.activeWalletId)) {
            this.activeWalletId = this.wallets[0]?.id ?? null;
        }

        this.renderSelector();
    }

    renderSelector() {
        this.renderNativeSelect();
        this.renderCustomList();
        this.updateTriggerDisplay();
        this.updateEmptyState();

        if (this.wallets.length === 0) {
            this.closeDropdown({ returnFocus: false });
        }
    }

    renderNativeSelect() {
        if (!this.selectorElement) {
            return;
        }

        this.selectorElement.innerHTML = '';

        if (this.wallets.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhuma carteira cadastrada';
            this.selectorElement.appendChild(option);
            this.selectorElement.disabled = true;
            this.selectorElement.value = '';
            return;
        }

        this.selectorElement.disabled = false;

        this.wallets.forEach((wallet) => {
            const option = document.createElement('option');
            option.value = wallet.id;
            option.textContent = wallet.name;
            if (wallet.id === this.activeWalletId) {
                option.selected = true;
            }
            this.selectorElement.appendChild(option);
        });

        this.selectorElement.value = this.activeWalletId ? String(this.activeWalletId) : '';
    }

    renderCustomList() {
        if (!this.listElement) {
            return;
        }

        this.listElement.innerHTML = '';

        if (this.wallets.length === 0) {
            return;
        }

        this.wallets.forEach((wallet) => {
            const option = this.createOptionElement(wallet);
            this.listElement.appendChild(option);
        });

        this.highlightSelection();
    }

    createOptionElement(wallet) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wallet-selector-option';
        button.dataset.walletOption = String(wallet.id);
        button.setAttribute('role', 'option');

        const color = normalizeHexColor(wallet.color, DEFAULT_WALLET_VISUAL.color);
        const contrast = getContrastColor(color);

        button.innerHTML = `
            <span class="visual-chip visual-chip--sm wallet-selector-option-chip" style="background:${color};color:${contrast};">
                <i class="${wallet.icon || DEFAULT_WALLET_VISUAL.icon}" aria-hidden="true"></i>
            </span>
            <span class="wallet-selector-option-texts">
                <span class="wallet-selector-option-name">${wallet.name}</span>
                <span class="wallet-selector-option-meta">Saldo ${formatCurrency(wallet.balance)}</span>
            </span>
            <span class="wallet-selector-option-check" aria-hidden="true">
                <i class="fa-solid fa-check"></i>
            </span>
        `;

        if (wallet.id === this.activeWalletId) {
            button.classList.add('is-active');
            button.setAttribute('aria-selected', 'true');
        } else {
            button.setAttribute('aria-selected', 'false');
        }

        button.addEventListener('click', () => {
            this.selectWallet(wallet.id);
            this.closeDropdown();
        });

        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.selectWallet(wallet.id);
                this.closeDropdown();
            }
        });

        return button;
    }

    updateTriggerDisplay() {
        if (!this.triggerElement) {
            return;
        }

        // Se existem carteiras mas nenhuma ativa definida, force a primeira
        if (this.wallets.length > 0 && (this.activeWalletId === null || !this.wallets.some(w => w.id === this.activeWalletId))) {
            this.activeWalletId = this.wallets[0].id;
        }

        const wallet = this.wallets.find((item) => item.id === this.activeWalletId) || null;
        const fallbackColor = '#e2e8f0';
        const color = wallet ? normalizeHexColor(wallet.color, DEFAULT_WALLET_VISUAL.color) : fallbackColor;
        const contrast = getContrastColor(color);
        const iconClass = wallet?.icon || DEFAULT_WALLET_VISUAL.icon;

        if (this.previewElement) {
            this.previewElement.style.background = color;
            this.previewElement.style.color = contrast;
        }

        if (this.iconElement) {
            this.iconElement.className = iconClass;
            this.iconElement.setAttribute('aria-hidden', 'true');
        }

        if (this.nameElement) {
            this.nameElement.textContent = wallet ? wallet.name : 'Nenhuma carteira';
        }

        if (this.metaElement) {
            this.metaElement.textContent = wallet
                ? `Saldo ${formatCurrency(wallet.balance)}`
                : 'Clique para adicionar';
        }

        this.triggerElement.classList.toggle('is-empty', !wallet);
        this.triggerElement.disabled = this.wallets.length === 0;
        this.triggerElement.setAttribute('aria-disabled', this.wallets.length === 0 ? 'true' : 'false');
    }

    updateEmptyState() {
        if (!this.emptyElement) {
            return;
        }

        const isEmpty = this.wallets.length === 0;

        // Tornar mais resiliente: usar atributo hidden + classe + style
        if (isEmpty) {
            this.emptyElement.hidden = false;
            this.emptyElement.classList.remove('is-hidden');
            this.emptyElement.style.display = '';
        } else {
            this.emptyElement.hidden = true;
            this.emptyElement.classList.add('is-hidden');
            this.emptyElement.style.display = 'none';
        }

        if (this.listElement) {
            this.listElement.hidden = isEmpty;
            if (!isEmpty) {
                this.listElement.style.display = '';
            }
        }
    }

    selectWallet(walletId) {
        const previousWalletId = this.activeWalletId;
        const hasWallets = this.wallets.length > 0;

        if (walletId === null) {
            if (!hasWallets) {
                this.activeWalletId = null;
                return;
            }
            const fallbackId = previousWalletId && this.wallets.some((wallet) => wallet.id === previousWalletId)
                ? previousWalletId
                : this.wallets[0].id;
            this.forceSelectWallet(fallbackId);
            return;
        }

        if (!Number.isInteger(walletId) || !this.wallets.some((wallet) => wallet.id === walletId)) {
            return;
        }

        this.activeWalletId = walletId;

        if (this.selectorElement) {
            this.selectorElement.value = String(walletId);
        }

        this.highlightSelection();
        this.updateTriggerDisplay();

        if (typeof this.onWalletChange === 'function' && walletId !== previousWalletId) {
            this.onWalletChange(walletId, previousWalletId);
        }
    }

    highlightSelection() {
        if (!this.listElement) {
            return;
        }

        this.listElement.querySelectorAll('.wallet-selector-option').forEach((button) => {
            const isActive = Number(button.dataset.walletOption) === this.activeWalletId;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    forceSelectWallet(walletId) {
        if (walletId !== null && !this.wallets.some((wallet) => wallet.id === walletId)) {
            return;
        }

        this.activeWalletId = walletId;

        if (this.selectorElement) {
            this.selectorElement.value = walletId ? String(walletId) : '';
        }

        this.highlightSelection();
        this.updateTriggerDisplay();
    }
}