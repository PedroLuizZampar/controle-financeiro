export class NavigationManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = {
            dashboard: '/pages/dashboard.html',
            transactions: '/pages/transactions.html',
            wallets: '/pages/wallets.html',
            categories: '/pages/categories.html',
            goals: '/pages/goals.html'
        };
        this.pageContentContainer = document.getElementById('page-content');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPage('dashboard');
    }

    setupEventListeners() {
        // Navegação por botões do navbar
        document.addEventListener('click', (event) => {
            const navLink = event.target.closest('[data-page]');
            if (navLink) {
                event.preventDefault();
                const page = navLink.dataset.page;
                this.navigateTo(page);
            }
        });
    }

    async navigateTo(page) {
        if (!this.pages[page] || page === this.currentPage) {
            return;
        }

        try {
            // Atualizar estado visual do navbar
            this.updateNavbarState(page);
            
            // Carregar conteúdo da página
            await this.loadPage(page);
            
            // Atualizar página atual
            this.currentPage = page;
            
            // Disparar evento personalizado para outras partes da aplicação
            this.dispatchNavigationEvent(page);
            
        } catch (error) {
            console.error(`Erro ao navegar para ${page}:`, error);
            this.showErrorState();
        }
    }

    async loadPage(page) {
        if (!this.pages[page]) {
            throw new Error(`Página ${page} não encontrada`);
        }

        try {
            const response = await fetch(this.pages[page]);
            if (!response.ok) {
                throw new Error(`Erro ao carregar página: ${response.status}`);
            }
            
            const html = await response.text();
            this.pageContentContainer.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar página:', error);
            throw error;
        }
    }

    updateNavbarState(activePage) {
        // Remover classe active de todos os links
        const navLinks = document.querySelectorAll('.navbar-link');
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Adicionar classe active ao link correto
        const activeLink = document.querySelector(`[data-page="${activePage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    dispatchNavigationEvent(page) {
        const event = new CustomEvent('page-changed', {
            detail: { 
                currentPage: page,
                previousPage: this.currentPage 
            }
        });
        document.dispatchEvent(event);
    }

    showErrorState() {
        this.pageContentContainer.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">⚠️</div>
                <div class="error-state-title">Erro ao carregar página</div>
                <div class="error-state-description">
                    Não foi possível carregar o conteúdo. Tente novamente.
                </div>
                <button class="btn btn-primary" onclick="location.reload()">
                    Recarregar página
                </button>
            </div>
        `;
    }

    getCurrentPage() {
        return this.currentPage;
    }

    // Método para outras partes da aplicação forçarem navegação
    forceNavigateTo(page) {
        this.navigateTo(page);
    }
}