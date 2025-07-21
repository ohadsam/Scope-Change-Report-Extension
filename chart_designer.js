const plannedColor = '#00abf3';
const descopedColor = '#d41200';
const unplannedColor = '#00796b';

let params;
let entityType;

export function initScopeChart(plannedItems, descopedItems, unplannedItems, Labels, trendDrillDownCacheId, paramsVal, entityTypeVal) {

    params = paramsVal;
    entityType = entityTypeVal;

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
                    //data: plannedItems,
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
                    position: 'right',
                    align: 'start',
                    display: true,
                    labels: {
                        color: '#777',
                        usePointStyle: false,
                        boxWidth: 15,
                        boxHeight: 15,
                        padding: 10,
                        font: {
                            size: 11,
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
                        if (ci.isDatasetVisible(index)) {
                            legendItem.hidden = true;
                            ci.hide(index);
                        } else {
                            legendItem.hidden = false;
                            ci.show(index);
                        }
                    }
                },
                title: {display: true, text: 'Scope Change Report', color: '#323435'},
                datalabels: {
                    anchor: 'center',
                    align: 'top',
                    color: '#000',
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
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const datasetIndex = elements[0].datasetIndex;
                    const label = evt.chart.data.labels[index];
                    const value = evt.chart.data.datasets[datasetIndex].data[index];

                    // Show modal with info
                    document.getElementById('modalContent').innerText = `Details for Label: ${label}: Value - ${JSON.stringify(value)}, Index: ${index}, datasetIndex: ${datasetIndex}`;
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
                max: yChartMakHeight
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
