

    export function createScopeTypeSelectorComponent(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <div class="config-line">
                <label class="config-label" for="xaxis-select">X Axis</label>
                <select id="xaxis-select" class="select-dropdown">
                    <option value="xaxis-release">Release</option>
                    <option value="xaxis-sprint">Sprint</option>
                    <option value="xaxis-milestone">Milestone</option>
                </select>
            </div>
            
            <!--<div id="milestone-length-container" class="margin&#45;&#45;left&#45;&#45;165 config-line buffer-container">-->
            <div id="milestone-length-container" class="config-line">
                <!--<label id="milestone-length-label" for="milestone-length">Length (Days)</label>-->
                <label id="milestone-length-label" for="milestone-length" class="buffer-label">Length (Days)</label>
                <input
                  type="number"
                  id="milestone-length"
                  value="28"
                  min="1"
                  max="100"
                  class="number-input"
                />
            </div>
            
            <!--<div id="planning-buffer-container" class="margin&#45;&#45;left&#45;&#45;165 config-line buffer-container">-->
            <div id="planning-buffer-container" class="config-line">
                <!--<label id="start-date-planning-buffer-label" for="start-date-planning-buffer" class="number-input-label">Start Buffer(Days)</label>-->
                <label id="start-date-planning-buffer-label" for="start-date-planning-buffer" class="buffer-label">Planning deadline</label>
                <input
                  type="number"
                  id="start-date-planning-buffer"
                  value="0"
                  min="-1000"
                  max="1000"
                  class="number-input"
                />
                <label id="start-date-after-input-label" class="margin--left--16 config-label"></label>
                <label id="end-date-planning-buffer-label" for="end-date-planning-buffer" class="number-input-label" style="display: none;">End Buffer(Days)</label>
                <input
                  type="number"
                  id="end-date-planning-buffer"
                  value="0"
                  min="-1000"
                  max="1000"
                  class="number-input"
                  style="display: none;"
                />
            </div>
        `;

        container.innerHTML = html;

        const select = document.getElementById('xaxis-select');
        select.addEventListener('change', handleSelectionChange);
        handleSelectionChange();

        const milestoneLengthInput = document.getElementById('milestone-length');
        const startDatePlanningBuffer = document.getElementById('start-date-planning-buffer');
        const endDatePlanningBuffer = document.getElementById('end-date-planning-buffer');

        milestoneLengthInput.addEventListener('input', () => {
            validateInputValue(milestoneLengthInput);
        });

        startDatePlanningBuffer.addEventListener('input', () => {
            validateInputValue(startDatePlanningBuffer);
        });

        endDatePlanningBuffer.addEventListener('input', () => {
            validateInputValue(endDatePlanningBuffer);
        });
        return select;
    }

    function handleSelectionChange() {
        const select = document.getElementById('xaxis-select');
        const milestoneLengthContainer = document.getElementById('milestone-length-container');
        const planningBufferContainer = document.getElementById('planning-buffer-container');
        const afterInputLabel = document.getElementById('start-date-after-input-label');

        milestoneLengthContainer.style.display = (select.value === 'xaxis-milestone') ? 'flex' : 'none';
        planningBufferContainer.style.display = (select.value !== 'xaxis-milestone') ? 'flex' : 'none';

        afterInputLabel.innerText = (select.value === 'xaxis-release') ? 'days after release starts' : 'days after sprint starts';
    }

    function validateInputValue(inputField) {
        const min = parseInt(inputField.min);
        const max = parseInt(inputField.max);
        inputField.value = (inputField.value ? inputField.value : inputField.getAttribute('value'));
        let value = parseInt(inputField.value);

        if (isNaN(value)) return;

        if (value < min) inputField.value = min;
        if (value > max) inputField.value = max;
    }