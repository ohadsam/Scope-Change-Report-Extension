

    export function createYAxisSelectorComponent(containerId, sumSelectValues) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <div class="upper-text-config-line">
                <label id="function-label" class="margin--left--165 upper-text">Function</label>
            </div>
            <div class="config-line">
                <label class="config-label" for="yaxis-select">Y Axis</label>
                <select id="yaxis-select" class="select-dropdown small-selector">
                    <option value="yaxis-count">Count</option>
                    <option value="yaxis-sum">Sum</option>
                </select>
                <select id="sum-select" class="select-dropdown small-selector">
                     ${sumSelectValues.map(opt => `
                <option value="${opt.field}">${opt.label}</option>
              `).join('')}
                </select>
            </div>
        `;

        container.innerHTML = html;

        const select = document.getElementById('yaxis-select');
        select.addEventListener('change', handleSelectionChange);
        handleSelectionChange();

        return select;
    }

    function handleSelectionChange() {
        const select = document.getElementById('yaxis-select');
        const sumSelectorContainer = document.getElementById('sum-select');

        sumSelectorContainer.style.display = (select.value === 'yaxis-sum') ? 'flex' : 'none';
    }