

    export function createMultiSelectDropDownComponent(entityName, containerId, options = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
      <div class="custom-dropdown-wrapper">
        <label>${entityName}:</label>
        <input type="text" id="${containerId}-selected" class="selection-display" readonly placeholder="No selection" />
        <div class="custom-dropdown">
          <button class="dropdown-toggle">
            Select ${entityName} <span class="arrow">&#9662;</span>
          </button>
          <div class="dropdown-content">
            <input type="text" class="search-input" placeholder="Search...">
            <div class="options-scroll">
            <form>
              ${options.map(opt => `
                <label><input type="checkbox" value="${opt.value}"> ${opt.label}${opt.default ? ' <span class="default-tag">Default</span>' : ''}</label>
              `).join('')}
            </form>
            </div>
            <div class="dropdown-buttons">
                <button type="button" class="cancel-btn">Cancel</button>
                <button type="button" class="clear-btn">Clear</button>
                <button type="button" class="ok-btn">OK</button>
            </div>
          </div>
        </div>
      </div>
    `;

        container.innerHTML = html;

        const wrapper = container.querySelector('.custom-dropdown-wrapper');
        const dropdown = wrapper.querySelector('.dropdown-content');
        const toggleBtn = wrapper.querySelector('.dropdown-toggle');
        const searchInput = wrapper.querySelector('.search-input');
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        const display = wrapper.querySelector('.selection-display');
        let previousSelection = [];

        toggleBtn.addEventListener('click', () => {
            dropdown.classList.toggle('show');
        });

        wrapper.querySelector('.ok-btn').addEventListener('click', () => {
            const selected = [];
            const selectedIDs = [];
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    selected.push(cb.parentElement.textContent.trim());
                    selectedIDs.push(cb.value);
                }
            });
            previousSelection = selected;
            display.value = selected.join(', ') || 'No selection';
            dropdown.classList.remove('show');

            const event = new CustomEvent('multiSelectChange', {
                detail: {
                    selectedText: selected,
                    selectedValues: selectedIDs
                }
            });
            container.dispatchEvent(event);
        });

        wrapper.querySelector('.cancel-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => {
                cb.checked = previousSelection.includes(cb.parentElement.textContent.trim());
            });
            dropdown.classList.remove('show');
        });

        wrapper.querySelector('.clear-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
        });

        searchInput.addEventListener('keyup', () => {
            const filter = searchInput.value.toLowerCase();
            wrapper.querySelectorAll('form label').forEach(label => {
                const text = label.textContent.toLowerCase();
                label.style.display = text.includes(filter) ? '' : 'none';
            });
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }
