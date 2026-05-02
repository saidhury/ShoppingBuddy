// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Model Selection Logic ---
    const serviceSelect = document.getElementById('llm_service');
    const modelSelect = document.getElementById('generation_model');

    if (serviceSelect && modelSelect) {
        function updateModelOptions() {
            const selectedService = serviceSelect.value;
            // Ensure modelOptionsData exists and has the key
            const models = (typeof modelOptionsData !== 'undefined' && modelOptionsData[selectedService]) ? modelOptionsData[selectedService] : [];

            // Clear current model options
            modelSelect.innerHTML = '<option value="">-- Select Model --</option>'; // Placeholder

            // Add new options
            if (models.length > 0) {
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    // Try to re-select previous model if service and model match
                    if (typeof previouslySelectedService !== 'undefined' && selectedService === previouslySelectedService &&
                        typeof previouslySelectedModel !== 'undefined' && model === previouslySelectedModel) {
                        option.selected = true; // Select this option
                    }
                    modelSelect.appendChild(option);
                });
            } else {
                 // Handle case where a service might have no models listed
                 modelSelect.innerHTML = '<option value="">-- No models available --</option>';
                 modelSelect.disabled = true; // Optionally disable if no models
            }

            // Ensure selection is still valid or reset
            if (modelSelect.selectedIndex < 0 || modelSelect.value === "") {
                 modelSelect.value = ""; // Reset to placeholder if current value is invalid
            }
             modelSelect.disabled = !(models.length > 0); // Disable if no models, enable otherwise
        }

        // Add event listener to service dropdown
        serviceSelect.addEventListener('change', updateModelOptions);

        // Initial population of model dropdown when page loads
        // Check if previouslySelectedService exists before calling
        if (typeof previouslySelectedService !== 'undefined') {
             // Pre-select the service if it exists
             if (serviceSelect.querySelector(`option[value="${previouslySelectedService}"]`)) {
                 serviceSelect.value = previouslySelectedService;
             }
        }
        updateModelOptions(); // Populate models based on initial/pre-selected service

    } else {
        console.warn("LLM Service or Generation Model select elements not found.");
    }

    // --- Form Submission Loading State ---
    const form = document.getElementById('recommendation-form');
    const submitButton = document.getElementById('submit-button');
    const buttonIcon = document.getElementById('button-icon');
    const buttonText = document.getElementById('button-text');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const profileSkeleton = document.getElementById('profile-skeleton');
    const profileContainer = document.getElementById('profile-container');
    const profilePlaceholder = document.getElementById('profile-placeholder');
    const recommendationsContainer = document.getElementById('recommendations-container');
    const debugSection = document.getElementById('debug-section');
    const resultsWrapper = document.getElementById('results-wrapper');

    if (form && submitButton && buttonIcon && buttonText) {
        const originalIconHTML = '<i class="fas fa-magic mr-2"></i>';
        const loadingIconHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>'; // Font Awesome spinner
        const originalButtonText = 'Get Recommendations';
        const loadingButtonText = 'Getting Recommendations...';

        form.addEventListener('submit', (event) => {
            // Basic check: Ensure model is selected if it's not disabled
            if (!modelSelect.disabled && modelSelect.value === "") {
                event.preventDefault(); // Stop submission
                alert("Please select a Generation Model."); // Simple feedback
                // Optionally add visual indication to the model select field
                modelSelect.focus();
                modelSelect.classList.add('border-red-500'); // Example styling
                setTimeout(() => modelSelect.classList.remove('border-red-500'), 2000); // Remove styling after a delay
                return; // Exit handler
            }

            // If validation passes, proceed to show loading state
            console.log("Form submitted, showing loading state...");
            submitButton.disabled = true;
            buttonIcon.innerHTML = loadingIconHTML;
            buttonText.textContent = loadingButtonText;

            // Show skeleton, hide actual lists
            if (profileSkeleton) profileSkeleton.classList.remove('hidden');
            if (profileContainer) profileContainer.classList.add('hidden');
            if (profilePlaceholder) profilePlaceholder.classList.add('hidden');

            if (skeletonLoader) {
                skeletonLoader.classList.remove('hidden');
                // Auto scroll smoothly to results overarching grid so the profile skeleton is also visible
                if (resultsWrapper) {
                    const y = resultsWrapper.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                } else {
                    skeletonLoader.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
            if (recommendationsContainer) recommendationsContainer.classList.add('hidden');
            if (debugSection) debugSection.classList.add('hidden');

            // The form will now submit and cause a page reload.
            // No explicit reset needed here because the reload handles it.
        });
    } else {
        console.warn("Form or button elements for loading state not found.");
    }

    // --- Quick Try Buttons Logic ---
    const quickTryBtns = document.querySelectorAll('.quick-try-btn');
    const customerIdInput = document.getElementById('customer_id');

    quickTryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (customerIdInput && form) {
                const targetId = e.currentTarget.getAttribute('data-id');
                customerIdInput.value = targetId;
                
                // Only submit if a model is selected (wait a tiny bit for the model to update if it hasn't)
                setTimeout(() => {
                   if(modelSelect && modelSelect.value !== "") {
                       form.requestSubmit(); // Will trigger submit event handler
                   } else {
                       alert("Please ensure an LLM Service and Model are selected first.");
                   }
                }, 100);
            }
        });
    });

    // --- Debug Toggle Panel Logic ---
    const debugToggleBtn = document.getElementById('debug-toggle-btn');
    const debugPanel = document.getElementById('debug-panel');

    if (debugToggleBtn && debugPanel) {
        debugToggleBtn.addEventListener('click', () => {
            debugPanel.classList.toggle('hidden');
            const icon = debugToggleBtn.querySelector('i');
            if (debugPanel.classList.contains('hidden')) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-code');
            } else {
                icon.classList.remove('fa-code');
                icon.classList.add('fa-chevron-up');
            }
        });
    }

    // --- Simple Navbar Placeholder Content ---
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center h-16">
                    <div class="flex-shrink-0 flex items-center">
                         <i class="fas fa-robot text-2xl text-indigo-600 mr-2"></i>
                         <span class="font-bold text-xl text-gray-800">ShoppingBuddy</span>
                    </div>
                    <nav class="flex items-center">
                        <button type="button" id="open-about-modal" class="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition flex items-center">
                            <i class="fas fa-info-circle mr-1.5"></i> About the Project
                        </button>
                    </nav>
                </div>
            </div>
        `;
    }

    // --- Modal Logic ---
    const aboutModal = document.getElementById('about-modal');
    const openAboutModalBtn = document.getElementById('open-about-modal');
    const closeAboutModalBtns = document.querySelectorAll('.close-modal-btn');
    
    if (aboutModal && openAboutModalBtn) {
        openAboutModalBtn.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden'); // Prevent scrolling
        });

        closeAboutModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                aboutModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            });
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) {
                aboutModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        });
    }

    // --- Simple Subtitle Placeholder ---
    const subtitleElement = document.getElementById('subtitle');
    if(subtitleElement) {
        subtitleElement.textContent = "Enter a Customer ID and select an LLM to receive product suggestions.";
    }

}); // End DOMContentLoaded