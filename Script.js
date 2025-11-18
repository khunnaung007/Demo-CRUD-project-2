class GitHubCRUD {
    constructor() {
        this.clientId = 'YOUR_GITHUB_CLIENT_ID';
        this.clientSecret = 'YOUR_GITHUB_CLIENT_SECRET';
        this.redirectUri = window.location.origin;
        this.scopes = ['repo', 'user'];
        this.accessToken = localStorage.getItem('github_access_token');
        this.user = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.checkAuthentication();
    }

    bindEvents() {
        // Authentication buttons
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Repository actions
        document.getElementById('createRepoBtn').addEventListener('click', () => this.showCreateModal());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadRepositories());

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('repoForm').addEventListener('submit', (e) => this.handleRepoSubmit(e));

        // Confirmation modal
        document.querySelectorAll('.close-btn').forEach(btn => {
            if (btn.id !== 'closeModal') {
                btn.addEventListener('click', () => this.hideConfirmModal());
            }
        });
        document.getElementById('confirmCancel').addEventListener('click', () => this.hideConfirmModal());
    }

    login() {
        const authUrl = `https://github.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${this.scopes.join('%20')}`;
        window.location.href = authUrl;
    }

    async checkAuthentication() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            await this.exchangeCodeForToken(code);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (this.accessToken) {
            await this.loadUserProfile();
            this.showMainContent();
            await this.loadRepositories();
        } else {
            this.showLoginPrompt();
        }
    }

    async exchangeCodeForToken(code) {
        try {
            const response = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: code,
                    redirect_uri: this.redirectUri
                })
            });

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                localStorage.setItem('github_access_token', this.accessToken);
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error);
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                this.user = await response.json();
                this.displayUserInfo();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    displayUserInfo() {
        const userInfo = document.getElementById('userInfo');
        userInfo.innerHTML = `
            <img src="${this.user.avatar_url}" alt="${this.user.login}" class="user-avatar">
            <span>${this.user.login}</span>
        `;
        userInfo.classList.remove('hidden');
    }

    showLoginPrompt() {
        document.getElementById('loginPrompt').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
    }

    showMainContent() {
        document.getElementById('loginPrompt').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
    }

    logout() {
        this.accessToken = null;
        this.user = null;
        localStorage.removeItem('github_access_token');
        this.showLoginPrompt();
    }

    async loadRepositories() {
        const reposList = document.getElementById('reposList');
        reposList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading repositories...</div>';

        try {
            const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const repos = await response.json();
                this.displayRepositories(repos);
            } else {
                throw new Error('Failed to load repositories');
            }
        } catch (error) {
            reposList.innerHTML = `<div class="error">Error loading repositories: ${error.message}</div>`;
        }
    }

    displayRepositories(repos) {
        const reposList = document.getElementById('reposList');
        
        if (repos.length === 0) {
            reposList.innerHTML = '<div class="loading">No repositories found. Create your first repository!</div>';
            return;
        }

        reposList.innerHTML = repos.map(repo => `
            <div class="repo-card">
                <div class="repo-header">
                    <a href="${repo.html_url}" target="_blank" class="repo-name">
                        <i class="fas fa-book"></i> ${repo.name}
                    </a>
                    <div class="repo-actions">
                        <button class="btn btn-warning btn-sm" onclick="githubCRUD.editRepository('${repo.name}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="githubCRUD.confirmDelete('${repo.name}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <p class="repo-description">${repo.description || 'No description provided'}</p>
                <div class="repo-meta">
                    <span><i class="fas fa-code-branch"></i> ${repo.default_branch}</span>
                    <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                    <span><i class="fas fa-eye"></i> ${repo.private ? 'Private' : 'Public'}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(repo.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    showCreateModal() {
        document.getElementById('modalTitle').textContent = 'Create New Repository';
        document.getElementById('repoForm').reset();
        document.getElementById('submitBtn').textContent = 'Create Repository';
        document.getElementById('repoModal').classList.remove('hidden');
    }

    showEditModal(repoName) {
        // In a real implementation, you would fetch the repo details first
        document.getElementById('modalTitle').textContent = 'Edit Repository';
        document.getElementById('repoName').value = repoName;
        document.getElementById('submitBtn').textContent = 'Update Repository';
        document.getElementById('repoModal').classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('repoModal').classList.add('hidden');
    }

    async handleRepoSubmit(e) {
        e.preventDefault();
        
        const repoName = document.getElementById('repoName').value;
        const description = document.getElementById('repoDescription').value;
        const isPrivate = document.getElementById('repoPrivate').checked;
        const autoInit = document.getElementById('repoReadme').checked;

        const repoData = {
            name: repoName,
            description: description,
            private: isPrivate,
            auto_init: autoInit
        };

        try {
            const isEdit = document.getElementById('modalTitle').textContent === 'Edit Repository';
            
            if (isEdit) {
                await this.updateRepository(repoName, repoData);
            } else {
                await this.createRepository(repoData);
            }
            
            this.hideModal();
            await this.loadRepositories();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    async createRepository(repoData) {
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(repoData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create repository');
        }

        return await response.json();
    }

    async updateRepository(repoName, repoData) {
        const response = await fetch(`https://api.github.com/repos/${this.user.login}/${repoName}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(repoData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update repository');
        }

        return await response.json();
    }

    async deleteRepository(repoName) {
        const response = await fetch(`https://api.github.com/repos/${this.user.login}/${repoName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete repository');
        }
    }

    confirmDelete(repoName) {
        this.repoToDelete = repoName;
        document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${repoName}"? This action cannot be undone.`;
        document.getElementById('confirmModal').classList.remove('hidden');
        
        document.getElementById('confirmAction').onclick = () => this.executeDelete();
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        this.repoToDelete = null;
    }

    async executeDelete() {
        try {
            await this.deleteRepository(this.repoToDelete);
            this.hideConfirmModal();
            await this.loadRepositories();
        } catch (error) {
            alert(`Error deleting repository: ${error.message}`);
            this.hideConfirmModal();
        }
    }

    editRepository(repoName) {
        this.showEditModal(repoName);
    }
}

// Initialize the application
const githubCRUD = new GitHubCRUD(); 
