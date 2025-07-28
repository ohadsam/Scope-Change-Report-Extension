

    export function createMultiSelectDropDownComponent(entityName, containerId, options = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
      <div class="config-line custom-dropdown-wrapper">
        <label class="config-label">${entityName}</label>
        <div class="custom-dropdown">
          <div class="input-container">
            <div id="${containerId}-selected-tags" class="selected-tags"></div>
            <input type="text" id="${containerId}-selected" class="selection-display" readonly />
            <button class="dropdown-toggle" type="button" aria-label="Toggle dropdown"></button>
          </div>
          <div class="dropdown-content">
            <input type="text" id="${containerId}-search" class="search-input" placeholder="Search...">
            <div class="options-scroll">
            <form>
              ${options.map(opt => `
                <label><input type="checkbox" value="${opt.value}"> ${opt.label}${opt.default ? ' <span class="default-tag">Default</span>' : ''}</label>
              `).join('')}
            </form>
            </div>
            <div class="dropdown-buttons">
                <button type="button" class="ok-btn">OK</button>
                <button type="button" class="clear-btn">Clear</button>
                <button type="button" class="cancel-btn">Cancel</button>
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
            const search = document.querySelector(`#${containerId}-search`);
            setTimeout(() => {
                search?.focus();
            }, 200);
        });

        wrapper.querySelector('.ok-btn').addEventListener('click', () => {
            const selected = [];
            const selectedIDs = [];
            const checkboxIDs = [];
            let checkboxIndex = 0;
            checkboxes.forEach(cb => {
                if (cb.checked) {
                    selected.push(cb.parentElement.textContent.trim());
                    selectedIDs.push(cb.value);
                    checkboxIDs.push(checkboxIndex);
                }
                checkboxIndex++;
            });
            previousSelection = selected;

            display.value = ''; // Clear text input
            const tagsContainer = wrapper.querySelector('.selected-tags');
            tagsContainer.innerHTML = '';
            selected.forEach((text, i) => {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.setAttribute('cb-index', checkboxIDs[i]);
                tag.setAttribute('cb-text', text);

                const textTag = document.createElement('span');
                textTag.className = 'tag-text';
                textTag.textContent = text;

                const remove = document.createElement('span');
                remove.className = 'remove-tag';
                remove.textContent = '×';
                remove.onclick = (e) => {
                    const selected = [];
                    const selectedIDs = [];
                    const checkboxIDs = [];
                    const index = e.currentTarget.parentElement.getAttribute('cb-index');
                    checkboxes[index].checked = false;
                    let cbIndex = 0;
                    checkboxes.forEach(cb => {
                        if (cb.checked) {
                            selected.push(cb.parentElement.textContent.trim());
                            selectedIDs.push(cb.value);
                            checkboxIDs.push(cbIndex);
                        }
                        cbIndex++;
                    });
                    previousSelection = selected;
                    tag.remove();
                    triggerMultiSelectEvent(container, selected, selectedIDs, checkboxIDs);
                };

                tag.appendChild(textTag);
                tag.appendChild(remove);
                tagsContainer.appendChild(tag);
            });

            dropdown.classList.remove('show');

            triggerMultiSelectEvent(container, selected, selectedIDs, checkboxIDs);
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

    function triggerMultiSelectEvent(container, selected, selectedIDs, checkboxIDs) {
        const event = new CustomEvent('multiSelectChange', {
            detail: {
                selectedText: selected,
                selectedValues: selectedIDs,
                checkboxIDs: checkboxIDs
            }
        });
        container.dispatchEvent(event);
    }
