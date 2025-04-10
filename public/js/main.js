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

            // The form will now submit and cause a page reload.
            // No explicit reset needed here because the reload handles it.
            // If this were an AJAX form, you would add a .finally() or similar block
            // to call a resetFormButton() function.
        });

        // Optional: Handle initial page load state if needed
        // This might be less critical now since the server handles the request/response cycle,
        // but could be useful if there was a scenario where the page rendered mid-request.
        // const isInitiallyLoading = ('<%= locals.customer_id && !locals.recommendations %>' === 'true'); // Can't use EJS here directly
        // Instead, you might pass a flag via another script variable if needed.
        // For now, we assume the page loads in a non-loading state unless the form is submitted.

    } else {
        console.warn("Form or button elements for loading state not found.");
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
                    <!-- Add Nav Links if needed -->
                    <!-- <nav class="hidden md:block">
                        <div class="ml-10 flex items-baseline space-x-4">
                            <a href="#" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Link 1</a>
                            <a href="#" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Link 2</a>
                        </div>
                    </nav> -->
                </div>
            </div>
        `;
    }

    // --- Simple Subtitle Placeholder ---
    const subtitleElement = document.getElementById('subtitle');
    if(subtitleElement) {
        subtitleElement.textContent = "Enter a Customer ID and select an LLM to receive product suggestions.";
    }

}); // End DOMContentLoaded