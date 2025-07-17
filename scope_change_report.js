/* eslint-disable angular/document-service,no-console,angular/log,no-alert,no-undef */
import { getBackgroundTask, postTrendDataDrillDown, getTrendDrillCacheWorkItems, getItems, getTrendDrillCacheGroups } from './data_fetcher.js';
import { initScopeChart } from "./chart_designer.js";
import { createMultiSelectDropDownComponent } from "./multiselect_dropdown.js";

let releases = [];
let teams = [];
let releaseMap = {};
let sprintMap = {};
let teamMap = {};
let previousScopeChart = undefined;

const generateReportButton = document.getElementById('create-report');
const typeSelect = document.getElementById('type-select');
const xaxisSelect = document.getElementById('xaxis-select');

let selectedReleases = [];
let selectedTeams = [];

function initGenrateReportButton(params) {

    // Show release dates on button click
    generateReportButton.addEventListener('click', async () => {
        try {
            showError(false);
            let teamsAsString = selectedTeams ? selectedTeams.join(',') : undefined;
            await createScopeChangeReport(params, selectedReleases, undefined, teamsAsString)
        } catch (error) {
            showLoading(false);
            showError(true, "Error while generating widget\n\n" + error);
        }
    });

}

async function initTeams(params) {
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

async function initReleases(params) {

    generateReportButton.setAttribute("disabled", "true");

    const releasesData = await getItems(params, 'release');//await getReleases(params);
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

            if (selectedReleases.length > 0) {
                generateReportButton.removeAttribute("disabled");
            } else {
                generateReportButton.setAttribute("disabled", "true");
            }
        });
    } else {
        releases = [];
        createMultiSelectDropDownComponent('Release','multi-release-select', []);
    }
    initGenrateReportButton(params);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createScopeChangeReport(params, releases, sprintId, teams) {
    if (previousScopeChart) {
        previousScopeChart.destroy();
    }
    const selectedType = typeSelect.value;
    const selectedXAxis = xaxisSelect.value;
    showLoading(true);
    let planned = [];
    let descoped = [];
    let unplanned = [];
    if (releases.length > 0){
        if (selectedXAxis === "xaxis-release") {
            const Labels = createChartLabels("Release", releases, releaseMap);
            for (const releaseID of releases) {
                const release = releaseMap[releaseID];
                if (release && release.start_date && release.end_date) {
                    const reportData = await getScopeReportData(params, selectedType, release.start_date, release.end_date, release.id, undefined, teams);
                    planned.push(reportData.planned);
                    descoped.push(reportData.descoped);
                    unplanned.push(reportData.unplanned);
                }
            }
            previousScopeChart = initScopeChart(planned, descoped, unplanned, Labels);
            showLoading(false);
        } else if (selectedXAxis === "xaxis-sprint") {
            for (const releaseID of releases) {
                const release = releaseMap[releaseID];
                if (!release['sprintMap']) {
                    const sprintsData = await getItems(params, 'sprint', parseInt(releaseID));
                    release['sprintMap'] = sprintsData.data;
                }
                for (const sprint of Object.values(release['sprintMap'])) {
                    if (sprint && sprint.start_date && sprint.end_date) {
                        const reportData = await getScopeReportData(params, selectedType, sprint.start_date, sprint.end_date, release.id, sprint.id, teams);
                        planned.push(reportData.planned);
                        descoped.push(reportData.descoped);
                        unplanned.push(reportData.unplanned);
                    }
                }
            }
            const Labels = createChartLabels("Sprint", releases, releaseMap);
            previousScopeChart = initScopeChart(planned, descoped, unplanned, Labels);
            showLoading(false);
        } else if (selectedXAxis === "xaxis-milestone") {
            showError(true, "Milestone Not Supported Yet\n\n" + "coming soon...");
            showLoading(false);
        }
    } else{
        previousScopeChart = initScopeChart([0], [0], [0], []);
        showLoading(false);
    }
}

async function getScopeReportData(params, entityType, startDate, endDate, releaseId, sprintID, teams) {
    if (!params || !startDate ||!endDate) {
        return {planned: 0, descoped: 0, unplanned: 0};
    }
    const scopeChangeData = await postTrendDataDrillDown(params, entityType, startDate, endDate, releaseId, sprintID, teams);
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
                    } else if(group.value === 2) { //unchaneged items
                        planned += group.count;
                    }
                });
            }
            return {planned: planned, descoped: descoped, unplanned: unplanned};
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

function createChartLabels(entityName, entities, entityMap) {
    const returnValue = [];
    if (entityName === "Release") {
        entities.forEach(entity => {
            returnValue.push(`${entityName}: ${entityMap[entity].name}`);
        });
    } else if (entityName === "Sprint") {
        entities.forEach(entity => {
            for (const sprint of Object.values(entityMap[entity]['sprintMap'])) {
                returnValue.push(`Release: ${entityMap[entity].name} - Sprint: ${sprint.name}`);
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
}


(async function () {
    'use strict';

    //const container = document.querySelector('.parameter-container');

    let params = {};


    await fetchParams();

    await initReleases(params);

    await initTeams(params);


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
