const entityNamesToValues = {
    release: {name: 'releases', fields: 'id,is_default,name,end_date,activity_level,start_date', order_by: '-id'},
    sprint: {name:'sprints', fields: 'id,name,start_date,end_date,shared', order_by: 'id'},
    team: {name: 'teams', fields: 'id,name', order_by: 'name'},
};

/*
http://localhost:8080/dev/internal-api/shared_spaces/1001/workspaces/1002/trend?entity-name=work_item&graph_title=Stories&rangeUnit=months&rangeValue=3&rangeOperator=last&xAxisUnit=weeks&cumulative=true&timezone=UTC%2B03%3A00&groupby=team&sets=[{"query":"((subtype='story');(phase={(metaphase={id='metaphase.work_item.done'})}))","groupBy":true,"key":"singleLine","overrideField":null}]&entity-subtypes=story
 */
/*export async function getTrendData(params) {
    const response = await fetch(`${params.octane_url}/internal-api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/trend?entity-name=work_item&graph_title=Stories&rangeUnit=months&rangeValue=3&rangeOperator=last&xAxisUnit=weeks&cumulative=true&timezone=UTC%252B03%253A00&groupby=team&sets=[{"query":"((subtype='story');(phase={(metaphase={id='metaphase.work_item.done'})}))","groupBy":true,"key":"singleLine","overrideField":null}]&entity-subtypes=story`);
    const data = await response.json();
    return data;
}*/

/*
http://localhost:8080/dev/internal-api/shared_spaces/1001/workspaces/1002/trend/drill_down
 */
export async function postTrendDataDrillDown(params, entityType, start, end, releaseID, sprintID, teamID) {
    let sprintQueryValue = sprintID ? `;(sprint={id=${sprintID}})` : '';
    let teamQueryValue = teamID ? `;(team={id=${teamID}})` : '';
    const response = await fetch(`${params.octane_url}/internal-api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/trend/drill_down`, {
        method: 'POST',
        headers: {
            'XSRF-HEADER': params.xsrf_token
        },
        body: JSON.stringify({
            'entity-name': 'work_item',
            'graph_title': entityType,
            //'rangeUnit': 'months',
            //'rangeValue': '3',
            'range': `[${releaseID}]`,
            'rangeOperator': 'releasePeriod',
            'xAxisUnit': 'weeks',
            'cumulative': 'true',
            'timezone': 'UTC%2B03%3A00',
            //'groupby': 'team',
            //'sets': "[{\"query\":\"((subtype='story');(phase={(metaphase={id='metaphase.work_item.done'})}))\",\"groupBy\":true,\"key\":\"singleLine\",\"overrideField\":null}]",
            //'sets': `[{\"query\":\"((subtype='${entityType}');(release={id=${releaseID}});`+sprintQueryValue+`(phase={(metaphase={id='metaphase.work_item.done'})}))\",\"groupBy\":false,\"key\":\"singleLine\",\"overrideField\":null}]`,
            'sets': `[{\"query\":\"((subtype='${entityType}');(release={id=${releaseID}})${sprintQueryValue}${teamQueryValue})\",\"groupBy\":false,\"key\":\"singleLine\",\"overrideField\":null}]`,
            'entity-subtypes': entityType,
            'compare_start_date': start,
            'compare_end_date': end,
            //'group_by_value': '1001'
        })
    });
    const data = await response.json();
    return data;
}

/*
http://localhost:8080/dev/api/shared_spaces/1001/workspaces/1002/background_tasks?fetch_single_entity=true&fields=creation_time,client_lock_stamp,attachments,has_attachments,version_stamp,author,end_time,result,workspace_id,start_time,app_key,correlation_id,task_type,max_wait_time,last_modified,status&offset=0&query=%22(id%3D%272004%27)%22
 */
export async function getBackgroundTask(params, bgTaskID) {
    const response = await fetch(`${params.octane_url}/api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/background_tasks?fetch_single_entity=true&fields=task_type,result,correlation_id,last_modified,status&offset=0&query="(id=${bgTaskID})"`);
    const data = await response.json();
    return data;
}


/*
http://localhost:8080/dev/api/shared_spaces/1001/workspaces/1002/trend_drill_cache_datas/groups?&group_by=category&query="(trend_drill_cache={(id='1004')})"
 */
export async function getTrendDrillCacheGroups(params, cacheID) {
    const response = await fetch(`${params.octane_url}/api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/trend_drill_cache_datas/groups?&group_by=category&query="(trend_drill_cache={(id='${cacheID}')})"`);
    const data = await response.json();
    return data;
}

/*
http://localhost:8080/dev/api/shared_spaces/1001/workspaces/1002/work_items?fields=id,name,is_deleted_entity,trend_drill_down_field_old_values,trend_drill_down_field_new_values,rank,phase,epic_level,followed_by_me,blocked,has_attachments,story_points,sprint,author,tasks_number,subtype,owner,shared,entity_icon,author{full_name},owner{full_name},parent{entity_icon,subtype},release{end_date},detected_in_release{end_date},milestone{release_specific,date,release}&limit=100&offset=0&order_by=id&query="((trend_drill_cache_data={((trend_drill_cache={(id='1004')});(category=2))});(subtype='story'))"&trend_drill_down_cache_data_category=2&trend_drill_down_cache_id=1004
 */
export async function getTrendDrillCacheWorkItems(params, entityType, cacheID, category) {
    const response = await fetch(`${params.octane_url}/api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/work_items?fields=id,name,is_deleted_entity,trend_drill_down_field_old_values,trend_drill_down_field_new_values,phase,story_points,sprint,author,subtype,owner,entity_icon,author{full_name},owner{full_name},parent{entity_icon,subtype},release{end_date},detected_in_release{end_date},milestone{release_specific,date,release}&limit=2000&offset=0&order_by=id&query="((trend_drill_cache_data={((trend_drill_cache={(id='${cacheID}')});(category=${category}))});(subtype='${entityType}'))"&trend_drill_down_cache_data_category=2&trend_drill_down_cache_id=${cacheID}"`);
    const data = await response.json();
    return data;
}

/*
http://localhost:8080/dev/api/shared_spaces/1001/workspaces/1002/releases?fields=id,is_default,name,end_date,activity_level,num_of_sprints,start_date,has_attachments,agile_type,shared&limit=100&offset=0&order_by=-id&request_origin=1002
 */
/*export async function getReleases(params){
    const response = await fetch(`${params.octane_url}/api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/releases?fields=id,is_default,name,end_date,activity_level,start_date&order_by=-id`);
    const data = await response.json();
    return data;
}

/!*
http://localhost:8080/dev/api/shared_spaces/1001/workspaces/1002/sprints?fields=name,start_date,end_date,shared&query="(release={id=1002})"
 *!/
export async function getSprints(params, releaseID){
    const response = await fetch(`${params.octane_url}/api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/sprints?fields=name,start_date,end_date,shared&query="(release={id=${releaseID}})"`);
    const data = await response.json();
    return data;
}*/

export async function getItems(params, entityName, releaseID){
    const entityVal = entityNamesToValues[entityName];
    if (entityVal) {
        let query = '';
        if (releaseID) {
            query = `&query="(release={id=${releaseID}})"`;
        }
        const response = await fetch(`${params.octane_url}/api/shared_spaces/${params.shared_space}/workspaces/${params.workspace}/${entityVal.name}?fields=${entityVal.fields}${query}&order_by=${entityVal.order_by}`);
        const data = await response.json();
        return data;
    }
    return null;
}