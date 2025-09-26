export const ICON_OPTIONS = [
	{ value: 'fa-solid fa-wallet', label: 'Carteira' },
	{ value: 'fa-solid fa-piggy-bank', label: 'Cofrinho' },
	{ value: 'fa-solid fa-coins', label: 'Moedas' },
	{ value: 'fa-solid fa-chart-line', label: 'Investimentos' },
	{ value: 'fa-solid fa-chart-pie', label: 'Relatórios' },
	{ value: 'fa-solid fa-money-bill-wave', label: 'Notas' },
	{ value: 'fa-solid fa-building-columns', label: 'Banco' },
	{ value: 'fa-solid fa-credit-card', label: 'Cartão' },
	{ value: 'fa-solid fa-cash-register', label: 'Caixa' },
	{ value: 'fa-solid fa-briefcase', label: 'Trabalho' },
	{ value: 'fa-solid fa-bag-shopping', label: 'Compras' },
	{ value: 'fa-solid fa-utensils', label: 'Refeições' },
	{ value: 'fa-solid fa-mug-hot', label: 'Café' },
	{ value: 'fa-solid fa-car', label: 'Carro' },
	{ value: 'fa-solid fa-plane', label: 'Viagem' },
	{ value: 'fa-solid fa-house', label: 'Casa' },
	{ value: 'fa-solid fa-lightbulb', label: 'Energia' },
	{ value: 'fa-solid fa-heart-pulse', label: 'Saúde' },
	{ value: 'fa-solid fa-dumbbell', label: 'Academia' },
	{ value: 'fa-solid fa-graduation-cap', label: 'Educação' },
	{ value: 'fa-solid fa-gift', label: 'Presentes' },
	{ value: 'fa-solid fa-bolt', label: 'Urgente' },
	{ value: 'fa-solid fa-leaf', label: 'Natureza' },
	{ value: 'fa-solid fa-seedling', label: 'Sustentável' },
	{ value: 'fa-solid fa-music', label: 'Entretenimento' },
	{ value: 'fa-solid fa-palette', label: 'Criativo' },
	{ value: 'fa-solid fa-bullseye', label: 'Meta' },
	{ value: 'fa-solid fa-ranking-star', label: 'Prioridade' },
	{ value: 'fa-solid fa-circle-nodes', label: 'Rede' }
];

export class IconPicker {
	constructor() {
		this.template = document.getElementById('icon-picker-template');
		this.panel = null;
		this.gridElement = null;
		this.searchInput = null;
		this.onSelect = null;
		this.currentSelected = null;
		this.filteredIcons = ICON_OPTIONS;
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	open({ selected, onSelect }) {
		if (!this.template) {
			throw new Error('Template do seletor de ícones não encontrado.');
		}

		this.close();

		this.onSelect = onSelect;
		this.currentSelected = selected || ICON_OPTIONS[0]?.value || 'fa-solid fa-circle';
		const fragment = this.template.content.cloneNode(true);
		const panel = fragment.querySelector('[data-icon-picker]');

		this.panel = panel;
		this.gridElement = panel.querySelector('[data-icon-picker-grid]');
		this.searchInput = panel.querySelector('[data-icon-picker-search]');

		const closeButton = panel.querySelector('[data-icon-picker-close]');
		closeButton?.addEventListener('click', (event) => {
			event.preventDefault();
			this.close();
		});

		document.body.appendChild(panel);

		this.renderIcons(this.currentSelected, ICON_OPTIONS);

		if (this.searchInput) {
			this.searchInput.value = '';
			this.searchInput.addEventListener('input', () => {
				const query = this.searchInput.value.toLowerCase();
				this.filteredIcons = ICON_OPTIONS.filter((option) =>
					option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
				);
				this.renderIcons(this.currentSelected, this.filteredIcons);
			});

			requestAnimationFrame(() => this.searchInput?.focus());
		}

		document.addEventListener('keydown', this.handleKeyDown);
	}

	renderIcons(selected, options) {
		if (!this.gridElement) {
			return;
		}

		this.filteredIcons = options;
		this.gridElement.innerHTML = '';
		options.forEach((option) => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'icon-picker__option';
			button.dataset.iconValue = option.value;
			button.innerHTML = `<i class="${option.value}" aria-hidden="true"></i><span>${option.label}</span>`;
			if (option.value === selected) {
				button.classList.add('is-active');
			}

			button.addEventListener('click', (event) => {
				event.preventDefault();
				this.currentSelected = option.value;
				this.highlightSelection(option.value);
				if (typeof this.onSelect === 'function') {
					this.onSelect(option.value);
				}
			});

			this.gridElement.appendChild(button);
		});
	}

	highlightSelection(value) {
		if (!this.gridElement) {
			return;
		}

		this.gridElement.querySelectorAll('.icon-picker__option').forEach((button) => {
			button.classList.toggle('is-active', button.dataset.iconValue === value);
		});
	}

	close() {
		if (!this.panel) {
			return;
		}

		document.removeEventListener('keydown', this.handleKeyDown);
		this.panel.remove();
		this.panel = null;
		this.gridElement = null;
		this.searchInput = null;
		this.onSelect = null;
	}

	handleKeyDown(event) {
		if (event.key === 'Escape') {
			this.close();
		}
	}
}
