/* eslint-disable angular/document-service,no-console,angular/log,no-alert,no-undef */
import { getBackgroundTask, postTrendDataDrillDown, getTrendDrillCacheWorkItems, getItems, getTrendDrillCacheGroups } from './data_fetcher.js';
import { initScopeChart } from "./chart_designer.js";

let releases = [];
let sprints = [];
let teams = [];
let releaseMap = {};
let sprintMap = {};
let teamMap = {};
let previousScopeChart = undefined;

const releaseSelect = document.getElementById('release-select');
const generateReportButton = document.getElementById('create-report');
const sprintSelect = document.getElementById('sprint-select');
const teamSelect = document.getElementById('team-select');
const typeSelect = document.getElementById('type-select');

function initGenrateReportButton(params) {

    // Show release dates on button click
    generateReportButton.addEventListener('click', async () => {
        const releaseId = releaseSelect.value;
        const sprintId = sprintSelect.value;
        const teamId = teamSelect.value;
        await createScopeChangeReport(params, releaseMap[releaseId], sprintId, teamId)
    });

}

async function initTeams(params) {
    const teamsData = await getItems(params, 'team');
    teamMap = {};
    if (teamsData.data) {
        teams = teamsData.data;
        teams.forEach(team => {
            teamMap[teams.id] = team;
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            teamSelect.appendChild(option);
        });
    } else {
        teams = [];
        teamSelect.innerHTML = '<option value="">Select a team</option>';
    }
}

async function initReleases(params) {

    generateReportButton.setAttribute("disabled", "true");

    const releasesData = await getItems(params, 'release');//await getReleases(params);
    releaseMap = {};
    sprintMap = {};
    if (releasesData.data) {
        releases = releasesData.data;
        releases.forEach(release => {
            releaseMap[release.id] = release;
            const option = document.createElement('option');
            option.value = release.id;
            option.textContent = release.name;
            releaseSelect.appendChild(option);
        });


        // Populate sprints when a release is selected
        releaseSelect.addEventListener('change', async () => {

            const releaseId = releaseSelect.value;
            if (releaseId) {
                generateReportButton.removeAttribute("disabled");
            } else {
                generateReportButton.setAttribute("disabled", "true");
            }

            sprintSelect.innerHTML = '<option value=-1>No Sprint</option>';
            const sprintsData = await getItems(params, 'sprint', parseInt(releaseId));
            sprints = sprintsData.data;
            if (sprints) {
                const option = document.createElement('option');
                option.value = -2;
                option.textContent = "All Sprints";
                sprintSelect.appendChild(option);
                sprints.forEach(sprint => {
                    sprintMap[sprint.id] = sprint;
                    const option = document.createElement('option');
                    option.value = sprint.id;
                    option.textContent = sprint.name;
                    sprintSelect.appendChild(option);
                });
            }
        });
    } else {
        releases = [];
        releaseSelect.innerHTML = '<option value="No Releases">No Releases</option>';
    }
    initGenrateReportButton(params);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function createScopeChangeReport(params, release, sprintId, teamId) {
    if (previousScopeChart) {
        previousScopeChart.destroy();
    }
    const selectedType = typeSelect.value;
    showLoading(true);
    if (release && release.start_date && release.end_date) {
        const Labels = createChartLabels(release, sprintId);
        //if it's release scope
        if (sprintId === "-1") {
            const reportData = await getScopeReportData(params, selectedType, release.start_date, release.end_date, release.id, undefined, teamId);
            previousScopeChart = initScopeChart([reportData.planned], [reportData.descoped], [reportData.unplanned], Labels);
        } else if (sprintId === "-2" && sprintMap) {
            let planned = [];
            let descoped = [];
            let unplanned = [];
            for (const sprint of Object.values(sprintMap)) {
                const reportData = await getScopeReportData(params, selectedType, sprint.start_date, sprint.end_date, release.id, sprint.id, teamId);
                planned.push(reportData.planned);
                descoped.push(reportData.descoped);
                unplanned.push(reportData.unplanned);
            }
            previousScopeChart = initScopeChart(planned, descoped, unplanned, Labels);
        } else if (sprintMap && sprintMap[sprintId]) {
            let sprint = sprintMap[sprintId];
            const reportData = await getScopeReportData(params, selectedType, sprint.start_date, sprint.end_date, release.id, sprint.id, teamId);
            previousScopeChart = initScopeChart([reportData.planned], [reportData.descoped], [reportData.unplanned], Labels);
        } else {
            previousScopeChart = initScopeChart([0], [0], [0], []);
        }
        showLoading(false);
    } else{
        previousScopeChart = initScopeChart([0], [0], [0], []);
        showLoading(false);
    }
}

async function getScopeReportData(params, entityType, startDate, endDate, releaseId, sprintID, teamID) {
    if (!params || !startDate ||!endDate) {
        return {planned: 0, descoped: 0, unplanned: 0};
    }
    const scopeChangeData = await postTrendDataDrillDown(params, entityType, startDate, endDate, releaseId, sprintID, teamID);
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

function createChartLabels(release, sprintId) {
    //it's release scope
    if (sprintId === "-1") {
        return ["Release: " + release.name];
    } else if (sprintId === "-2" && sprintMap) {
        let returnValue = [];
        for (const sprint of Object.values(sprintMap)) {
            returnValue.push(sprint.name);
        }
        return returnValue;
    } else if (sprintMap && sprintMap[sprintId]) {
        return ["Sprint: " + sprintMap[sprintId].name];
    } else {
        return [];
    }
}

function showLoading(show) {
    const icon = document.getElementById('loading_icon');
    if (icon) {
        icon.style.display = show ? "flex" : "none";
    }
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
