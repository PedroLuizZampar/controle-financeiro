export class ModalManager {
    constructor() {
        this.modalTemplate = document.getElementById('modal-template');
        this.activeModal = null;
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    open({ title, content }) {
        if (!this.modalTemplate) {
            throw new Error('Template de modal não encontrado.');
        }

        this.close();

        const fragment = this.modalTemplate.content.cloneNode(true);
        const modal = fragment.querySelector('[data-modal]');

        const titleElement = modal.querySelector('[data-modal-title]');
        if (titleElement) {
            titleElement.textContent = title;
        }

        const contentContainer = modal.querySelector('[data-modal-content]');
        if (contentContainer && content) {
            contentContainer.appendChild(content);
        }

        document.body.appendChild(modal);
        document.body.classList.add('modal-open');
        this.activeModal = modal;

        const firstField = modal.querySelector('input, select, textarea, button');
        if (firstField) {
            requestAnimationFrame(() => firstField.focus());
        }

        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('keydown', this.handleKeyDown);

        return modal;
    }

    close() {
        if (!this.activeModal) {
            document.body.classList.remove('modal-open');
            return;
        }

        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeyDown);

        this.activeModal.remove();
        this.activeModal = null;
        document.body.classList.remove('modal-open');
    }

    handleDocumentClick(event) {
        if (!this.activeModal) {
            return;
        }

        const closeTrigger = event.target.closest('[data-modal-close]');
        if (closeTrigger) {
            event.preventDefault();
            this.close();
        }
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }
}
