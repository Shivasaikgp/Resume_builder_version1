class ResumeBuilder {
    constructor() {
        this.resumeData = {
            personal: {},
            experience: [],
            skills: [],
            education: {}
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePreview();
    }

    bindEvents() {
        // AI enhancement buttons
        document.querySelectorAll('.ai-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAIEnhancement(e));
        });

        // Form inputs
        document.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => this.updateResumeData());
        });

        // Add experience button
        document.getElementById('addExperience').addEventListener('click', () => {
            this.addExperienceItem();
        });

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadResume();
        });
    }

    async handleAIEnhancement(e) {
        const button = e.target;
        const targetId = button.dataset.target;
        const targetElement = targetId ? 
            document.getElementById(targetId) : 
            button.parentElement.querySelector('.ai-enhanced');

        if (!targetElement) return;

        const currentText = targetElement.value;
        const section = button.closest('.section').dataset.section;

        // Show loading state
        button.innerHTML = '⏳';
        button.disabled = true;

        try {
            const suggestions = await this.getAISuggestions(currentText, section);
            this.showAIModal(suggestions, targetElement);
        } catch (error) {
            console.error('AI enhancement failed:', error);
            this.showError('AI enhancement failed. Please try again.');
        } finally {
            button.innerHTML = '✨';
            button.disabled = false;
        }
    }

    async getAISuggestions(text, section) {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock AI suggestions - replace with actual API call
        const suggestions = {
            personal: [
                "Experienced software developer with 5+ years in full-stack development",
                "Results-driven professional with expertise in modern web technologies",
                "Passionate developer focused on creating scalable solutions"
            ],
            experience: [
                "• Developed and maintained web applications using React and Node.js",
                "• Collaborated with cross-functional teams to deliver high-quality software",
                "• Implemented responsive designs and optimized application performance"
            ],
            skills: [
                "JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker",
                "Frontend: React, Vue.js, HTML5, CSS3, TypeScript",
                "Backend: Node.js, Express, Python, Django, REST APIs"
            ]
        };

        return suggestions[section] || [
            "Enhanced version of your content with improved clarity",
            "Professional rewrite with industry-standard terminology",
            "Optimized content for ATS compatibility"
        ];
    }

    showAIModal(suggestions, targetElement) {
        const modal = document.getElementById('aiModal');
        const suggestionsContainer = modal.querySelector('.ai-suggestions');
        
        suggestionsContainer.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.className = 'suggestion-item';
            suggestionDiv.textContent = suggestion;
            suggestionDiv.addEventListener('click', () => {
                targetElement.value = suggestion;
                this.updateResumeData();
                this.updatePreview();
                this.closeModal();
            });
            suggestionsContainer.appendChild(suggestionDiv);
        });

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('aiModal').style.display = 'none';
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        alert(message);
    }

    updateResumeData() {
        // Update personal info
        this.resumeData.personal = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            summary: document.getElementById('summary').value
        };

        // Update skills
        this.resumeData.skills = document.getElementById('skills').value
            .split(',')
            .map(skill => skill.trim())
            .filter(skill => skill);

        this.updatePreview();
    }

    addExperienceItem() {
        const experienceList = document.getElementById('experienceList');
        const newItem = document.createElement('div');
        newItem.className = 'experience-item';
        newItem.innerHTML = `
            <div class="input-group">
                <input type="text" placeholder="Job Title" class="ai-enhanced">
                <button class="ai-btn">✨</button>
            </div>
            <input type="text" placeholder="Company">
            <div class="date-range">
                <input type="text" placeholder="Start Date">
                <input type="text" placeholder="End Date">
            </div>
            <div class="input-group">
                <textarea placeholder="Job Description & Achievements" class="ai-enhanced"></textarea>
                <button class="ai-btn">✨</button>
            </div>
        `;

        experienceList.appendChild(newItem);

        // Bind events for new elements
        newItem.querySelectorAll('.ai-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAIEnhancement(e));
        });

        newItem.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => this.updateResumeData());
        });
    }

    updatePreview() {
        const preview = document.getElementById('resumePreview');
        const data = this.resumeData;

        preview.innerHTML = `
            <h1>${data.personal.fullName || 'Your Name'}</h1>
            <div class="contact-info">
                ${data.personal.email || 'email@example.com'} | 
                ${data.personal.phone || '(555) 123-4567'}
            </div>
            
            ${data.personal.summary ? `
                <h2>Professional Summary</h2>
                <p>${data.personal.summary}</p>
            ` : ''}
            
            ${data.skills.length > 0 ? `
                <h2>Skills</h2>
                <p>${data.skills.join(', ')}</p>
            ` : ''}
            
            <h2>Work Experience</h2>
            <div class="experience-section">
                ${this.getExperienceHTML()}
            </div>
            
            <h2>Education</h2>
            <p>Your education details will appear here</p>
        `;
    }

    getExperienceHTML() {
        const experienceItems = document.querySelectorAll('.experience-item');
        let html = '';

        experienceItems.forEach(item => {
            const inputs = item.querySelectorAll('input, textarea');
            const jobTitle = inputs[0].value;
            const company = inputs[1].value;
            const startDate = inputs[2].value;
            const endDate = inputs[3].value;
            const description = inputs[4].value;

            if (jobTitle || company) {
                html += `
                    <div class="job-entry">
                        <h3>${jobTitle || 'Job Title'} - ${company || 'Company'}</h3>
                        <p><em>${startDate || 'Start'} - ${endDate || 'End'}</em></p>
                        <p>${description || 'Job description will appear here'}</p>
                    </div>
                `;
            }
        });

        return html || '<p>Your work experience will appear here</p>';
    }

    downloadResume() {
        // Simple download functionality - could be enhanced with PDF generation
        const resumeContent = document.getElementById('resumePreview').innerHTML;
        const blob = new Blob([`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resume</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2d3748; }
                    h2 { color: #4a5568; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
                    .contact-info { margin-bottom: 20px; color: #718096; }
                </style>
            </head>
            <body>${resumeContent}</body>
            </html>
        `], { type: 'text/html' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the resume builder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ResumeBuilder();
});