const plannedColor = '#00abf3';
const descopedColor = '#d41200';
const unplannedColor = '#00796b';


export function initScopeChart(plannedItems, descopedItems, unplannedItems, Labels) {

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
                    data: plannedItems,
                    backgroundColor: plannedColor
                },
                {
                    label: 'Descoped',
                    data: descopedItems,
                    backgroundColor: descopedColor
                },
                {
                    label: 'Unplanned',
                    data: unplannedItems,
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
                        //const index = legendItem.index;
                        //legendItem.hidden = !legendItem.hidden;
                        /*const chart = legend.chart;
                        chart.toggleDataVisibility(index);
                        chart.update();*/
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
                    formatter: Math.round
                },
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
