class LLMComparisonApp {
    constructor() {
        this.providers = [];
        this.ws = null;
        this.isComparing = false;
        this.responses = {
            provider1: '',
            provider2: ''
        };
        this.stats = {
            provider1: { firstTokenTime: null, totalTime: null, completionTokens: 0, tps: 0 },
            provider2: { firstTokenTime: null, totalTime: null, completionTokens: 0, tps: 0 }
        };
        
        this.init();
    }

    async init() {
        await this.loadProviders();
        this.setupEventListeners();
        this.setupWebSocket();
        this.populateProviderSelects();
        this.renderProviderList();
    }

    async loadProviders() {
        try {
            const response = await fetch('/api/providers');
            const data = await response.json();
            this.providers = data.providers;
        } catch (error) {
            console.error('Failed to load providers:', error);
            this.showError('Failed to load providers');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(e.target.dataset.page);
            });
        });

        // Comparison page
        document.getElementById('compare-btn').addEventListener('click', () => {
            this.compareResponses();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearResponses();
        });

        // Providers page
        document.getElementById('provider-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProvider();
        });
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        console.log('Connecting to WebSocket at:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected successfully');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error, event.data);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showError('WebSocket connection error. Check console for details.');
        };
        
        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                console.log('Attempting to reconnect WebSocket...');
                this.setupWebSocket();
            }, 3000);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'STREAM':
                this.handleStream(data);
                break;
            case 'STREAM_COMPLETE':
                this.handleStreamComplete(data);
                break;
            case 'COMPLETE':
                this.handleComparisonComplete();
                break;
            case 'ERROR':
                this.showError(data.message);
                this.enableCompareButton();
                break;
            case 'PROVIDER_ERROR':
                this.handleProviderError(data);
                break;
        }
    }

    handleStream(data) {
        const { provider, content, firstTokenTime, totalTime } = data;
        const responseElement = document.getElementById(`${provider}-response`);
        const statsElement = document.getElementById(`${provider}-stats`);
        
        this.responses[provider] += content;
        responseElement.textContent = this.responses[provider];
        
        // Auto-scroll to bottom as content streams in
        responseElement.scrollTop = responseElement.scrollHeight;
        
        if (firstTokenTime) {
            this.stats[provider].firstTokenTime = firstTokenTime;
        }
        
        if (totalTime) {
            this.stats[provider].totalTime = totalTime;
        }
        
        this.updateStats(provider);
    }

    handleStreamComplete(data) {
        const { provider, fullResponse, firstTokenTime, totalTime, completionTokens, tps } = data;
        const responseElement = document.getElementById(`${provider}-response`);
        const statsElement = document.getElementById(`${provider}-stats`);
        const responsePanel = responseElement.closest('.response-panel');
        
        this.responses[provider] = fullResponse;
        responseElement.textContent = fullResponse;
        
        // Auto-scroll to bottom to show completion
        responseElement.scrollTop = responseElement.scrollHeight;
        
        this.stats[provider] = { firstTokenTime, totalTime, completionTokens, tps };
        this.updateStats(provider);
        
        // Remove streaming animation and add completion indicator
        responseElement.classList.remove('streaming');
        responsePanel.classList.add('completed');
        
        // Add completion badge
        const header = responsePanel.querySelector('.response-header');
        if (!header.querySelector('.completion-badge')) {
            const badge = document.createElement('span');
            badge.className = 'completion-badge';
            badge.textContent = '✓ Complete';
            header.appendChild(badge);
        }
    }

    handleComparisonComplete() {
        this.isComparing = false;
        this.enableCompareButton();
        this.showSuccess('Comparison complete!');
    }

    handleProviderError(data) {
        const { provider, message } = data;
        const responseElement = document.getElementById(`${provider}-response`);
        responseElement.innerHTML = `<div class="error">Error: ${message}</div>`;
        responseElement.classList.remove('streaming');
    }

    updateStats(provider) {
        const statsElement = document.getElementById(`${provider}-stats`);
        const { firstTokenTime, totalTime, completionTokens, tps } = this.stats[provider];
        
        console.log(`Updating stats for ${provider}:`, this.stats[provider]);
        
        let statsText = '';
        if (firstTokenTime) {
            statsText += `First token: ${firstTokenTime}ms`;
        }
        if (totalTime) {
            if (statsText) statsText += ' | ';
            statsText += `Total: ${totalTime}ms`;
        }
        if (completionTokens > 0) {
            if (statsText) statsText += ' | ';
            statsText += `Tokens: ${completionTokens}`;
        }
        if (tps > 0) {
            if (statsText) statsText += ' | ';
            statsText += `TPS: ${tps}`;
        }
        
        console.log(`Stats text for ${provider}:`, statsText);
        statsElement.textContent = statsText;
    }

    switchPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
        
        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}-page`).classList.add('active');
    }

    populateProviderSelects() {
        const select1 = document.getElementById('provider1-select');
        const select2 = document.getElementById('provider2-select');
        
        // Clear existing options
        select1.innerHTML = '<option value="">Select a provider</option>';
        select2.innerHTML = '<option value="">Select a provider</option>';
        
        // Add provider options
        this.providers.forEach(provider => {
            const option1 = new Option(provider.name, provider.id);
            const option2 = new Option(provider.name, provider.id);
            select1.add(option1);
            select2.add(option2);
        });
    }

    async compareResponses() {
        if (this.isComparing) return;
        
        const provider1Id = document.getElementById('provider1-select').value;
        const provider2Id = document.getElementById('provider2-select').value;
        const prompt = document.getElementById('prompt-input').value.trim();
        
        if (!provider1Id || !provider2Id) {
            this.showError('Please select both providers');
            return;
        }
        
        if (!prompt) {
            this.showError('Please enter a prompt');
            return;
        }
        
        if (provider1Id === provider2Id) {
            this.showError('Please select different providers');
            return;
        }
        
        this.isComparing = true;
        this.disableCompareButton();
        this.clearResponses();
        
        // Update provider titles
        const provider1 = this.providers.find(p => p.id === provider1Id);
        const provider2 = this.providers.find(p => p.id === provider2Id);
        
        document.getElementById('provider1-title').textContent = provider1.name;
        document.getElementById('provider2-title').textContent = provider2.name;
        
        // Add streaming animation
        document.getElementById('provider1-response').classList.add('streaming');
        document.getElementById('provider2-response').classList.add('streaming');
        
        // Send comparison request
        this.ws.send(JSON.stringify({
            type: 'COMPARE',
            prompt,
            provider1Id,
            provider2Id
        }));
    }

    clearResponses() {
        this.responses = { provider1: '', provider2: '' };
        this.stats = {
            provider1: { firstTokenTime: null, totalTime: null, completionTokens: 0, tps: 0 },
            provider2: { firstTokenTime: null, totalTime: null, completionTokens: 0, tps: 0 }
        };
        
        document.getElementById('provider1-response').textContent = '';
        document.getElementById('provider2-response').textContent = '';
        document.getElementById('provider1-stats').textContent = '';
        document.getElementById('provider2-stats').textContent = '';
        
        // Remove streaming and completion indicators
        document.getElementById('provider1-response').classList.remove('streaming');
        document.getElementById('provider2-response').classList.remove('streaming');
        
        // Remove completion panels and badges
        document.querySelectorAll('.response-panel').forEach(panel => {
            panel.classList.remove('completed');
        });
        document.querySelectorAll('.completion-badge').forEach(badge => {
            badge.remove();
        });
    }

    disableCompareButton() {
        const btn = document.getElementById('compare-btn');
        btn.disabled = true;
        btn.textContent = 'Comparing...';
    }

    enableCompareButton() {
        const btn = document.getElementById('compare-btn');
        btn.disabled = false;
        btn.textContent = 'Compare Responses';
    }

    async addProvider() {
        const name = document.getElementById('provider-name').value.trim();
        const baseUrl = document.getElementById('provider-base-url').value.trim();
        const apiKey = document.getElementById('provider-api-key').value.trim();
        const model = document.getElementById('provider-model').value.trim();
        
        if (!name || !baseUrl || !apiKey || !model) {
            this.showError('Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch('/api/providers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, baseUrl, apiKey, model }),
            });
            
            if (response.ok) {
                const newProvider = await response.json();
                this.providers.push(newProvider);
                this.populateProviderSelects();
                this.renderProviderList();
                this.clearProviderForm();
                this.showSuccess('Provider added successfully');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to add provider');
            }
        } catch (error) {
            console.error('Failed to add provider:', error);
            this.showError('Failed to add provider');
        }
    }

    async editProvider(providerId) {
        const provider = this.providers.find(p => p.id === providerId);
        if (!provider) {
            this.showError('Provider not found');
            return;
        }
        
        // Populate form with existing provider data
        document.getElementById('provider-name').value = provider.name;
        document.getElementById('provider-base-url').value = provider.baseUrl;
        document.getElementById('provider-api-key').value = provider.apiKey;
        document.getElementById('provider-model').value = provider.model;
        
        // Change form submit behavior to update instead of add
        const form = document.getElementById('provider-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const formTitle = form.querySelector('h3');
        
        // Update form UI
        formTitle.textContent = 'Edit Provider';
        submitBtn.textContent = 'Update Provider';
        submitBtn.onclick = (e) => {
            e.preventDefault();
            this.updateProvider(providerId);
        };
        
        // Add cancel button if it doesn't exist
        if (!form.querySelector('.btn-cancel')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn-secondary btn-cancel';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.marginLeft = '0.5rem';
            cancelBtn.onclick = () => this.resetProviderForm();
            submitBtn.parentNode.appendChild(cancelBtn);
        }
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    }

    async updateProvider(providerId) {
        const name = document.getElementById('provider-name').value.trim();
        const baseUrl = document.getElementById('provider-base-url').value.trim();
        const apiKey = document.getElementById('provider-api-key').value.trim();
        const model = document.getElementById('provider-model').value.trim();
        
        if (!name || !baseUrl || !apiKey || !model) {
            this.showError('Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch(`/api/providers/${providerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, baseUrl, apiKey, model }),
            });
            
            if (response.ok) {
                const updatedProvider = await response.json();
                const index = this.providers.findIndex(p => p.id === providerId);
                this.providers[index] = updatedProvider;
                this.populateProviderSelects();
                this.renderProviderList();
                this.resetProviderForm();
                this.showSuccess('Provider updated successfully');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to update provider');
            }
        } catch (error) {
            console.error('Failed to update provider:', error);
            this.showError('Failed to update provider');
        }
    }

    resetProviderForm() {
        const form = document.getElementById('provider-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const formTitle = form.querySelector('h3');
        
        // Reset form UI
        formTitle.textContent = 'Add New Provider';
        submitBtn.textContent = 'Add Provider';
        submitBtn.onclick = null;
        
        // Remove cancel button if it exists
        const cancelBtn = form.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.remove();
        }
        
        // Clear form data
        this.clearProviderForm();
    }

    async deleteProvider(providerId) {
        if (!confirm('Are you sure you want to delete this provider?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/providers/${providerId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                this.providers = this.providers.filter(p => p.id !== providerId);
                this.populateProviderSelects();
                this.renderProviderList();
                this.showSuccess('Provider deleted successfully');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Failed to delete provider');
            }
        } catch (error) {
            console.error('Failed to delete provider:', error);
            this.showError('Failed to delete provider');
        }
    }

    renderProviderList() {
        const listContainer = document.getElementById('provider-list');
        
        if (this.providers.length === 0) {
            listContainer.innerHTML = '<p>No providers configured. Add your first provider above.</p>';
            return;
        }
        
        listContainer.innerHTML = this.providers.map(provider => `
            <div class="provider-item">
                <div class="provider-info">
                    <h4>${provider.name}</h4>
                    <p><strong>Base URL:</strong> ${provider.baseUrl}</p>
                    <p><strong>Model:</strong> ${provider.model}</p>
                    <p><strong>API Key:</strong> ${provider.apiKey ? '••••••••' : 'Not set'}</p>
                </div>
                <div class="provider-actions">
                    <button class="btn-small btn-secondary" onclick="app.editProvider('${provider.id}')">
                        Edit
                    </button>
                    <button class="btn-small btn-danger" onclick="app.deleteProvider('${provider.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    clearProviderForm() {
        document.getElementById('provider-form').reset();
    }

    showError(message) {
        // Remove existing error messages
        document.querySelectorAll('.error').forEach(el => el.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // Remove existing success messages
        document.querySelectorAll('.success').forEach(el => el.remove());
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(successDiv, container.firstChild);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LLMComparisonApp();
});
