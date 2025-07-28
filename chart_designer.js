import { getTrendDrillCacheWorkItems } from './data_fetcher.js';

const plannedColor = '#3382FF';
const descopedColor = '#E60054';
const unplannedColor = '#7E8794';

let params;
let entityType;

export function initScopeChart(plannedItems, descopedItems, unplannedItems, Labels, trendDrillDownCacheId, paramsVal, entityTypeVal, widgetName='Scope Change Report', yAxisPrefix) {

    params = paramsVal;
    entityType = entityTypeVal;

    //used for double click events on the legend
    let lastClickTime = 0;
    const doubleClickThreshold = 300; // milliseconds


    const ctx = document.getElementById('scopeChart').getContext('2d');
    const yChartMakHeight = (Math.max(plannedItems, unplannedItems, descopedItems) + 3);
    Chart.register(ChartDataLabels);
    const scopeChart = new Chart(ctx, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
            labels: Labels,
            datasets: [
                {
                    label: 'Planned',
                    data: createDataObject(Labels, plannedItems, trendDrillDownCacheId),
                    backgroundColor: plannedColor
                },
                {
                    label: 'Descoped',
                    data: createDataObject(Labels,descopedItems, trendDrillDownCacheId),
                    backgroundColor: descopedColor
                },
                {
                    label: 'Unplanned',
                    data: createDataObject(Labels,unplannedItems, trendDrillDownCacheId),
                    backgroundColor: unplannedColor
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'start',
                    display: true,
                    labels: {
                        color: '#777',
                        usePointStyle: false,
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 10,
                        font: {
                            size: 10,
                        },
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((dataset, i) => {
                                const hidden = (chart.legend && chart.legend.legendItems && chart.legend.legendItems[i] && chart.legend.legendItems[i].hidden) ? true : false;

                                return {
                                    text: dataset.label,
                                    fillStyle: hidden ? '#fff' : dataset.backgroundColor,
                                    strokeStyle: '#000',
                                    lineWidth: hidden ? 0.2 : 0,
                                    hidden: hidden,
                                    index: i
                                };
                            });
                        }
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.index;
                        const ci = legend.chart;

                        const currentTime = new Date().getTime();
                        const timeDiff = currentTime - lastClickTime;
                        lastClickTime = currentTime;
                        if (timeDiff < doubleClickThreshold) {
                            // Double-click detected
                            legendItem.hidden = false;
                            for (const legendIt of ci.legend.legendItems) {
                                if (legendIt !== legendItem) {
                                    legendIt.hidden = true;
                                }
                            }
                            for (const legendIt of ci.legend.legendItems) {
                                if (legendIt.hidden) {
                                    ci.hide(legendIt.index);
                                } else {
                                    ci.show(legendIt.index);
                                }
                            }
                        } else {
                            if (ci.isDatasetVisible(index)) {
                                legendItem.hidden = true;
                                ci.hide(index);
                            } else {
                                legendItem.hidden = false;
                                ci.show(index);
                            }
                        }
                    }
                },
                title: {display: true, text: widgetName, color: '#323435'},
                datalabels: {
                    anchor: 'center',
                    align: 'top',
                    color: '#FFF',
                    font: {
                        weight: 'bold'
                    },
                    //formatter: Math.round
                    formatter: (value, context) => {
                        // If value is an object, return its `y` property
                        return typeof value === 'object' && value !== null ? Math.round(value.y) : Math.round(value);
                    },

                },
            },
            //click events for the bars
            onClick: async (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const datasetIndex = elements[0].datasetIndex;
                    const label = evt.chart.data.labels[index];
                    const value = evt.chart.data.datasets[datasetIndex].data[index];

                    const category = (datasetIndex === 0 ? [2,3] : (datasetIndex === 1 ? 3 : 1));
                    const deletedItemsCategory = (datasetIndex === 0 ? 2 : (datasetIndex === 1 ? 3 : 1));

                    const entities = await getTrendDrillCacheWorkItems(params, entityType, value.drillDownCacheID, category, deletedItemsCategory);
                    // Show modal with info
                    document.getElementById('modalContent').innerText = `Details for Label: ${label}: Value - ${JSON.stringify(value)}, Index: ${index}, datasetIndex: ${datasetIndex},  entities: ${entities.data.length}`;
                    document.getElementById('infoModal').style.display = 'block';

                }
            },
            scales: {
            x: {
                grid: {
                    display: false
                },
                stacked: false,
                barPercentage: 1.0,
                categoryPercentage: 0
            },
            y: {
                grid: {
                    display: false
                },
                stacked: false,
                beginAtZero: true,
                max: yChartMakHeight,
                title: {
                    display: true,
                    text: getYAxisLabel(yAxisPrefix, entityType), // This is the Y-axis label
                    color: '#323435',
                }
            }
        }
        }
    });

    return scopeChart;
}

function createDataObject(labels, values, trendDrillDownCacheId) {
    let returnVal = [];
    for (let i=0; i<values.length; i++) {
        returnVal.push({x: labels[i], y: values[i], drillDownCacheID: trendDrillDownCacheId[i]});
    }
    return returnVal;
}

function getYAxisLabel(prefix, entityType) {
    let returnVal = prefix;
    if (entityType === 'feature') {
        returnVal += 'Features';
    } else if (entityType === 'defect') {
        returnVal += 'Defects';
    } else if (entityType === 'story') {
        returnVal += 'Stories';
    } else if (entityType === 'quality_story') {
        returnVal += 'Quality Stories';
    } else {
        returnVal += 'Backlog Items';
    }
    return returnVal;
}
