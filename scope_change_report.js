/* eslint-disable angular/document-service,no-console,angular/log,no-alert,no-undef */
import { getBackgroundTask, postTrendDataDrillDown, getTrendDrillCacheWorkItems, getItems, getTrendDrillCacheGroups } from './data_fetcher.js';
import { initScopeChart } from "./chart_designer.js";
import { createMultiSelectDropDownComponent } from "./multiselect_dropdown.js";
import { calculateDateInFormat } from "./date_utils.js";
import { createScopeTypeSelectorComponent } from "./scope_type_selector.js";
import { createYAxisSelectorComponent } from "./y_axis_selector.js";

let params = {};
let releases = [];
let teams = [];
let releaseMap = {};
let sprintMap = {};
let teamMap = {};
let previousScopeChart = undefined;

const graphNameTextField = document.getElementById('graph-name');
const generateReportButton = document.getElementById('create-report');
const showWidgetSideBarButton = document.getElementById('show-widget-btn');
const typeSelect = document.getElementById('type-select');
let xaxisSelect = undefined
let yaxisSelect = undefined;

let selectedReleases = [];
let selectedTeams = [];

function enableGenerateButton(enabledBtn) {
    if (enabledBtn) {
        generateReportButton.removeAttribute("disabled");
        showWidgetSideBarButton.removeAttribute("disabled");
    } else {
        generateReportButton.setAttribute("disabled", "true");
        showWidgetSideBarButton.setAttribute("disabled", "true");
    }
}

async function generateReportClicked() {
    try {
        toggleSidebarSelection(showWidgetSideBarButton);
        showError(false);
        let teamsAsString = selectedTeams ? selectedTeams.join(',') : undefined;
        await createScopeChangeReport(selectedReleases, undefined, teamsAsString)
    } catch (error) {
        showLoading(false);
        showError(true, "Error while generating widget\n\n" + error);
    }
}

function initGenrateReportButton() {

    // Show release dates on button click
    generateReportButton.addEventListener('click', async () => {
        await generateReportClicked();
        /*try {
            showError(false);
            let teamsAsString = selectedTeams ? selectedTeams.join(',') : undefined;
            await createScopeChangeReport(params, selectedReleases, undefined, teamsAsString)
        } catch (error) {
            showLoading(false);
            showError(true, "Error while generating widget\n\n" + error);
        }*/
    });

}

async function initTeams() {
    const teamsData = await getItems(params, 'team');
    teamMap = {};
    let teamsForMultiSelect = [];
    if (teamsData.data) {
        teams = teamsData.data;
        teams.forEach(team => {
            teamMap[team.id] = team;
            teamsForMultiSelect.push({value: team.id, label: team.name});
        });
    } else {
        teams = [];
    }
    createMultiSelectDropDownComponent('Team','multi-team-select', teamsForMultiSelect);
    document.getElementById('multi-team-select').addEventListener('multiSelectChange', (e) => {
        selectedTeams = e.detail.selectedValues;
    });
}

async function initReleases() {
    enableGenerateButton(false);

    //generateReportButton.setAttribute("disabled", "true");

    const releasesData = await getItems(params, 'release');
    releaseMap = {};
    sprintMap = {};
    let releasesForMultiSelect = [];
    if (releasesData.data) {
        releases = releasesData.data;
        releases.forEach(release => {
            releaseMap[release.id] = release;
            releasesForMultiSelect.push({value: release.id, label: release.name});
        });

        createMultiSelectDropDownComponent('Release','multi-release-select', releasesForMultiSelect);
        // listen to multi teams selection
        document.getElementById('multi-release-select').addEventListener('multiSelectChange', (e) => {

            selectedReleases = e.detail.selectedValues;

            /*if (selectedReleases.length > 0) {
                generateReportButton.removeAttribute("disabled");
            } else {
                generateReportButton.setAttribute("disabled", "true");
            }*/
            enableGenerateButton(selectedReleases.length > 0);
        });
    } else {
        releases = [];
        createMultiSelectDropDownComponent('Release','multi-release-select', []);
    }
    initGenrateReportButton();
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createScopeChangeReport(releases, sprintId, teams) {
    if (previousScopeChart) {
        previousScopeChart.destroy();
    }

    const selectedType = typeSelect.value;
    const selectedXAxis = xaxisSelect.value;
    showLoading(true);
    let planned = [];
    let descoped = [];
    let unplanned = [];
    let trendDrillDownCacheId = [];
    if (releases.length > 0){
        if (selectedXAxis === "xaxis-release") {
            const Labels = createChartLabels("Release", releases, releaseMap);
            const startDateBuffer = document.getElementById('start-date-planning-buffer').value;
            const endDateBuffer = document.getElementById('end-date-planning-buffer').value;
            for (const releaseID of releases) {
                const release = releaseMap[releaseID];
                if (release && release.start_date && release.end_date) {
                    const releaseStartDate = calculateDateInFormat(release.start_date, parseInt(startDateBuffer), "after");
                    const releaseEndDate = calculateDateInFormat(release.end_date, parseInt(endDateBuffer), "after");
                    const reportData = await getScopeReportData(selectedType, releaseStartDate, releaseEndDate, release.id, undefined, undefined, teams);
                    planned.push(reportData.planned);
                    descoped.push(reportData.descoped);
                    unplanned.push(reportData.unplanned);
                    trendDrillDownCacheId.push(reportData.trendDrillDownCacheId);
                }
            }
            previousScopeChart = initScopeChart(planned, descoped, unplanned, Labels, trendDrillDownCacheId, params, selectedType, getGraphName('Release'), getYAxisLabelPrefix());
            showLoading(false);
        } else if (selectedXAxis === "xaxis-sprint") {
            for (const releaseID of releases) {
                const release = releaseMap[releaseID];
                if (!release['sprintMap']) {
                    const sprintsData = await getItems(params, 'sprint', parseInt(releaseID));
                    release['sprintMap'] = sprintsData.data;
                }
                const startDateBuffer = document.getElementById('start-date-planning-buffer').value;
                const endDateBuffer = document.getElementById('end-date-planning-buffer').value;
                for (const sprint of Object.values(release['sprintMap'])) {
                    if (sprint && sprint.start_date && sprint.end_date) {
                        const sprintStartDate = calculateDateInFormat(sprint.start_date, parseInt(startDateBuffer), "after");
                        const sprintEndDate = calculateDateInFormat(sprint.end_date, parseInt(endDateBuffer), "after");
                        const reportData = await getScopeReportData(selectedType, sprintStartDate, sprintEndDate, release.id, sprint.id, undefined, teams);
                        planned.push(reportData.planned);
                        descoped.push(reportData.descoped);
                        unplanned.push(reportData.unplanned);
                        trendDrillDownCacheId.push(reportData.trendDrillDownCacheId);
                    }
                }
            }
            const Labels = createChartLabels("Sprint", releases, releaseMap);
            previousScopeChart = initScopeChart(planned, descoped, unplanned, Labels, trendDrillDownCacheId, params, selectedType, getGraphName('Sprint'), getYAxisLabelPrefix());
            showLoading(false);
        } else if (selectedXAxis === "xaxis-milestone") {
            for (const releaseID of releases) {
                const release = releaseMap[releaseID];
                if (!release['milestoneMap']) {
                    const milestonesData = await getItems(params, 'milestone', parseInt(releaseID), true);
                    release['milestoneMap'] = milestonesData.data;
                }
                const milestoneLength = document.getElementById('milestone-length').value;
                for (const milestone of Object.values(release['milestoneMap'])) {
                    const milestoneStartDate = calculateDateInFormat(milestone.date, parseInt(milestoneLength), "before");
                    if (milestone && milestone.date) {
                        const reportData = await getScopeReportData(selectedType, milestoneStartDate, milestone.date, release.id, undefined, milestone.id, teams);
                        planned.push(reportData.planned);
                        descoped.push(reportData.descoped);
                        unplanned.push(reportData.unplanned);
                        trendDrillDownCacheId.push(reportData.trendDrillDownCacheId);
                    }
                }
            }
            const Labels = createChartLabels("Milestone", releases, releaseMap);
            previousScopeChart = initScopeChart(planned, descoped, unplanned, Labels, trendDrillDownCacheId, params, selectedType, getGraphName('Milestone'), getYAxisLabelPrefix());
            showLoading(false);
        }
    } else{
        previousScopeChart = initScopeChart([0], [0], [0], [], [], params, selectedType);
        showLoading(false);
    }
}

async function getScopeReportData(entityType, startDate, endDate, releaseId, sprintID, milestoneID, teams) {
    if (!startDate ||!endDate) {
        return {planned: 0, descoped: 0, unplanned: 0};
    }

    const scopeChangeData = await postTrendDataDrillDown(params, entityType, startDate, endDate, releaseId, sprintID, milestoneID, teams);
    if (scopeChangeData.backgroundTask) {
        let bgSuccess = false;
        let i = 0;
        while (!bgSuccess && i < 30) {
            const bgEntity = await getBackgroundTask(params, scopeChangeData.backgroundTask.id);
            if (bgEntity.data && bgEntity.data[0] && bgEntity.data[0].status === 'Finished') {
                bgSuccess = true;
            } else {
                i++;
                await sleep(3000);
            }
        }
        if (bgSuccess && scopeChangeData.trendDrillDownCacheId) {
            //if need to count the items
            if (yaxisSelect.value === "yaxis-count") {
                const groupedEntities = await getTrendDrillCacheGroups(params, scopeChangeData.trendDrillDownCacheId);
                let planned = 0;
                let descoped = 0;
                let unplanned = 0
                if (groupedEntities.groups && groupedEntities.groups.length > 0) {
                    groupedEntities.groups.forEach(group => {
                        if (group.value === 1) { //unplanned items
                            unplanned = group.count;
                        } else if (group.value === 3) { //descoped items
                            planned += group.count;
                            descoped = group.count;
                        } else if (group.value === 2) { //unchaneged items
                            planned += group.count;
                        }
                    });
                }
                return {
                    planned: planned,
                    descoped: descoped,
                    unplanned: unplanned,
                    trendDrillDownCacheId: scopeChangeData.trendDrillDownCacheId
                };
            } else { //if need to sum by story point fields
                const addedEntities = await getTrendDrillCacheWorkItems(params, entityType, scopeChangeData.trendDrillDownCacheId, 1, 1);
                const removedEntities = await getTrendDrillCacheWorkItems(params, entityType, scopeChangeData.trendDrillDownCacheId, 3, 3);
                const unChangedEntities = await getTrendDrillCacheWorkItems(params, entityType, scopeChangeData.trendDrillDownCacheId, 2, 2);
                const sumSelectValue = document.getElementById('sum-select').value;

                let descoped = collectEntitiesDataByField(removedEntities.data, sumSelectValue);
                let planned = collectEntitiesDataByField(unChangedEntities.data, sumSelectValue) + descoped;
                let unplanned = collectEntitiesDataByField(addedEntities.data, sumSelectValue);
                return {planned: planned,
                        descoped: descoped,
                        unplanned: unplanned,
                        trendDrillDownCacheId: scopeChangeData.trendDrillDownCacheId}

            }
            /*const addedEntities = await getTrendDrillCacheWorkItems(params, entityType, scopeChangeData.trendDrillDownCacheId, 1);
            const removedEntities = await getTrendDrillCacheWorkItems(params, entityType, scopeChangeData.trendDrillDownCacheId, 3);
            const unChangedEntities = await getTrendDrillCacheWorkItems(params, entityType, scopeChangeData.trendDrillDownCacheId, 2);
            return {planned: unChangedEntities.data.length + removedEntities.data.length,
                descoped: removedEntities.data.length,
                unplanned: addedEntities.data.length};*/
        }
    } else {
        return {planned: 0, descoped: 0, unplanned: 0};
    }
}

function collectEntitiesDataByField(entities, fieldName) {
    let sum=0;
    entities.forEach(entity => {
        sum += entity[fieldName] ? entity[fieldName] : 0;
    });
    return sum;
}

function getYAxisLabelPrefix() {
    if (yaxisSelect.value === "yaxis-count") {
        return 'Number of ';
    } else {
        const sumSelectedItem = document.getElementById('sum-select');
        const sumSelectTextContent = sumSelectedItem.options[sumSelectedItem.selectedIndex].textContent;
        return 'Sum of ' + sumSelectTextContent + ' for ';
    }
}

function createChartLabels(entityName, entities, entityMap) {
    const returnValue = [];
    if (entityName === "Release") {
        entities.forEach(entity => {
            returnValue.push(`${entityName}: ${entityMap[entity].name}`);
        });
    } else if (entityName === "Sprint") {
        entities.forEach(entity => {
            for (const sprint of Object.values(entityMap[entity]['sprintMap'])) {
                returnValue.push(`${entityMap[entity].name} - ${sprint.name}`);
            }
        });
    } else if (entityName === "Milestone") {
        entities.forEach(entity => {
            for (const milestone of Object.values(entityMap[entity]['milestoneMap'])) {
                returnValue.push(`${entityMap[entity].name} - ${milestone.name}`);
            }
        });
    }
    return returnValue;
}

function showLoading(show) {
    const icon = document.getElementById('loading_icon');
    if (icon) {
        icon.style.display = show ? "flex" : "none";
    }
}

function showError(show, message) {
    const error = document.getElementById('error-dialog-content');
    error.style.display = show ? "flex" : "none";
    error.textContent = message;
    const canvasDialog = document.getElementById('dialog-content');
    canvasDialog.style.display = !show ? "flex" : "none";
    if(show) {
        console.log("Error: " + message);
    }
}

function toggleSidebarSelection(selectedBtn) {
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('active');
        document.getElementById(btn.getAttribute("direct-to-att")).style.display = 'none';
    });
    selectedBtn.classList.add('active');
    document.getElementById(selectedBtn.getAttribute("direct-to-att")).style.display = 'block';
}

function getGraphName(capitalDefaultName, defaultText = "Scope Change Report") {
    if (graphNameTextField.value) {
        return graphNameTextField.value;
    } else {
        return capitalDefaultName + " " + defaultText;
    }
}

function handleEntityTypeSelectChanged() {
    const sumSelectValues = [];
    if (typeSelect.value === 'feature') {
        sumSelectValues.push({field: 'actual_story_points', label: 'Actual Story Points'});
        sumSelectValues.push({field: 'initial_estimate', label: 'Initial Estimate'});
        sumSelectValues.push({field: 'story_points', label: 'Story Points'});
    } else {
        sumSelectValues.push({field: 'estimated_hours', label: 'Estimated Hours'});
        sumSelectValues.push({field: 'invested_hours', label: 'Invested Hours'});
        sumSelectValues.push({field: 'remaining_hours', label: 'Remaining Hours'});
        sumSelectValues.push({field: 'story_points', label: 'Story Points'});
    }
    yaxisSelect = createYAxisSelectorComponent('y-axis-selector', sumSelectValues);
}

(async function () {
    'use strict';

    //const container = document.querySelector('.parameter-container');
    typeSelect.addEventListener('change', async () => {
        handleEntityTypeSelectChanged();
    });

    const showGeneralBtn = document.getElementById('show-general-btn');
    showGeneralBtn.addEventListener('click', () => {
        toggleSidebarSelection(showGeneralBtn);
    });

    const showConfigBtn = document.getElementById('show-config-btn');
    showConfigBtn.addEventListener('click', () => {
        toggleSidebarSelection(showConfigBtn);
    });

    const showDisplayBtn = document.getElementById('show-display-btn');
    showDisplayBtn.addEventListener('click', () => {
        toggleSidebarSelection(showDisplayBtn);
    });

    showWidgetSideBarButton.addEventListener('click', () => {
        generateReportClicked();
    });

    await fetchParams();

    xaxisSelect = createScopeTypeSelectorComponent('scope-type-selector');

    await initReleases();

    await initTeams();

    handleEntityTypeSelectChanged();


    //startUserIdentityValidation();

    window.onhashchange = fetchParams;

    /*const hasOpener = !!window.opener;
    const liveInOctaneDialog = window.parent !== window;

    let ownerWindow;

    if (liveInOctaneDialog) {
        ownerWindow = window.parent;
    } else if (hasOpener) {
        ownerWindow = window.opener;
    }

    document.querySelector('#hasOpenerValue').innerText = hasOpener;
    document.querySelector('#hasParentValue').innerText = liveInOctaneDialog;

    if (hasOpener || liveInOctaneDialog) {
        document.querySelector('#messageOctaneButtons').style.display = 'block';
        let entityTypeInput = document.querySelector('#entity_type');
        let entityIdInput = document.querySelector('#entity_id');

        if (params.entity_type) {
            entityTypeInput.value = params.entity_type;
        }
        entityIdInput.value = params.entity_ids;

        window.refreshOctaneEntity = function refreshOctaneEntity() {
            if (!entityIdInput.value) {
                alert('No entity_id were sent');
                return;
            }

            const entityType = entityTypeInput.value;
            const entityIds = entityIdInput.value.split(',');

            const message = {
                event_name: 'octane_refresh_entity',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    entity_type: entityType,
                    entity_ids: entityIds,
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };

        window.refreshOctaneList = function refreshOctaneEntity() {
            const entityType = entityTypeInput.value;

            const message = {
                event_name: 'octane_refresh_list',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    entity_type: entityType,
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };

        window.displayOctaneEntity = function displayOctaneEntity() {
            if (!entityIdInput.value) {
                alert('No entity_id was sent');
                return;
            }

            const message = {
                event_name: 'octane_display_entity',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    entity_type: entityTypeInput.value,
                    entity_id: entityIdInput.value,
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };

        window.selectOctaneEntity = function displayOctaneEntity() {
            if (!entityIdInput.value) {
                alert('No entity_id were sent');
                return;
            }

            const entityIds = entityIdInput.value.split(',');

            const message = {
                event_name: 'octane_select_entity',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    entity_type: entityTypeInput.value,
                    entity_ids: entityIds,
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };*/

        /*window.notifyOfNewOctaneEntity = function notifyOfNewOctaneEntity() {
            if (!entityIdInput.value) {
                alert('No entity_id was sent');
                return;
            }

            const message = {
                event_name: 'octane_entity_was_added',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    entity_type: entityTypeInput.value,
                    entity_id: entityIdInput.value,
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };

        window.updateSettings = function updateSettings(context) {
            // eslint-disable-next-line no-alert
            const text = prompt('message to save to settings', '');
            if (!text) {
                return;
            }

            const message = {
                event_name: 'octane_update_settings',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    context: context,
                    panel_id: params.panel_id || params.dialog_id,
                    settings: {text: text},
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };

        window.readSettings = function readSettings(context) {
            const message = {
                event_name: 'octane_read_settings',
                workspace: params.workspace,
                shared_space: params.shared_space,
                data: {
                    context: context,
                    panel_id: params.panel_id || params.dialog_id,
                },
            };

            ownerWindow.postMessage(message, '*');

            console.log('octane message posted');
        };

        window.addEventListener('message', (event) => {
            if (event.data?.event_name === 'octane_settings') {
                const message = `Received settings: \r\n ${JSON.stringify(event.data.data, null, '  ')}`;
                console.log(message);
                alert(message);
            }
        });

        if (liveInOctaneDialog && params.dialog_id) {
            document.querySelector('#setOctaneDialogTitleBlock').style.display = 'block';
            document.querySelector('#closeOctaneDialogBlock').style.display = 'block';

            document.querySelector('#dialogId').innerText = params.dialog_id;
            window.setOctaneDialogTitle = function setOctaneDialogTitle() {
                const message = {
                    event_name: 'octane_set_dialog_title',
                    workspace: params.workspace,
                    shared_space: params.shared_space,
                    data: {
                        dialog_id: params.dialog_id,
                        title: document.querySelector('#dialog_title').value,
                    },
                };

                ownerWindow.postMessage(message, '*');

                console.log('octane message posted');
            };

            window.setOctaneDialogTitle(); // set initial dialog title value

            window.closeOctaneDialog = function closeOctaneDialog() {
                const message = {
                    event_name: 'octane_close_dialog',
                    workspace: params.workspace,
                    shared_space: params.shared_space,
                    data: {
                        dialog_id: params.dialog_id,
                        refresh: document.querySelector('#refresh_results').checked,
                    },
                };

                ownerWindow.postMessage(message, '*');

                console.log('octane message posted');
            };
        }
    }

    window.tryLoadOctaneData = function tryLoadOctaneData() {
        if (!params.octane_url) {
            return;
        }

        const octane_url = params.octane_url;
        const url = octane_url + '/api/shared_spaces/' + params.shared_space + '/workspaces';

        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.withCredentials = true;
        request.setRequestHeader('Accept', 'application/json');
        request.setRequestHeader('HPECLIENTTYPE', 'external-details-app');

        request.onreadystatechange = function () {
            document.querySelector('#canFetchDataValue').innerText = request.status === 200;
        };

        request.send();
    };*/

   /* function addParam([name, value]) {
        params[name] = value;

        const item = document.createElement('li');
        item.innerText = name + ' : ' + value;

        container.appendChild(item);
    }*/

    /*async function checkUserIdentity(params) {
        const octane_url = params.octane_url;
        const jwt = params.user_identity_token;

        if (!jwt || !octane_url) {
            return;
        }

        if (jwt === '{user_identity_token}') {
            return;
        }

        const decodedToken = decodeJwt(jwt);

        if (decodedToken.payload === null) {
            throw new Error('Cannot parse user identity token.');
        }

        const {exp} = decodedToken.payload;

        const secondsNow = Math.floor(Date.now() / 1000);

        if (exp === null || exp < secondsNow) {
            throw new Error('Token is expired.');
        }

        const public_key_url = octane_url + '/api/jwt/key';
        const response = await fetch(public_key_url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                HPECLIENTTYPE: 'external-details-app',
                'XSRF-HEADER': params.xsrf_token,
                'ALM-OCTANE-TECH-PREVIEW': 'true',
            },
        });

        const {alg} = decodedToken.header;
        let {key: publicKey} = await response.json();
        const publicKeyToPem = '-----BEGIN PUBLIC KEY-----' + publicKey + '-----END PUBLIC KEY-----';
        const pubKey = KEYUTIL.getKey(publicKeyToPem);

        const isValid = KJUR.jws.JWS.verify(jwt, pubKey, [alg]);

        if (!isValid) {
            throw new Error('The signature of the user identity token is not valid.');
        }
    }

    function decodeJwt(token) {
        try {
            const tokenComponents = token.split('.');
            return {
                header: JSON.parse(atob(tokenComponents[0])),
                payload: JSON.parse(atob(tokenComponents[1])),
            };
        } catch (e) {
            return null;
        }
    }*/

    async function fetchParams() {
        const location = document.location;

        params = {};
        //container.innerHTML = '';

        const url = new URL(location);
        for (let paramNameAndValue of url.searchParams.entries()) {
            //addParam(paramNameAndValue);
            params[paramNameAndValue[0]] = paramNameAndValue[1];
        }

        const hashParams = new URLSearchParams(location.hash.substring(1));
        for (let paramNameAndValue of hashParams.entries()) {
            //addParam(paramNameAndValue);
            params[paramNameAndValue[0]] = paramNameAndValue[1];
        }
    }

    /*async function startUserIdentityValidation() {
        try {
            await checkUserIdentity(params);
        } catch (err) {
            console.warn('Failed to validate user identity. Reason:', err);

            document.querySelector('#userIdentityValidationBlock').style.display = 'block';
            document.querySelector('#userIdentityValidationErrorMessage').innerText = err?.message;
        }
    }*/
})();
