const plannedColor = '#66b3ff';   // Light Blue
const descopedColor = '#ff4d4d';  // Red
const unplannedColor = '#66cc66'; // Green


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
                legend: {position: 'top'},
                title: {display: true, text: 'Scope Change Report'},
                datalabels: {
                    anchor: 'center',
                    align: 'top',
                    color: '#000',
                    font: {
                        weight: 'bold'
                    },
                    formatter: Math.round
                }
            },
            scales: {
                x: {
                    stacked: false,
                    barPercentage: 1.0,
                    categoryPercentage: 0
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    max: yChartMakHeight
                }
            }
        }
    });
    return scopeChart;
}
