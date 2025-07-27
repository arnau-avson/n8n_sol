let chart = null;
let analysisData = null;

// Función para guardar predicción
function savePrediction(coin, data) {
    const prediction = {
        timestamp: new Date().getTime(),
        coin: coin,
        initialPrice: parseFloat(data.currentPrice),
        predictedChange: parseFloat(data.projectedMovement?.match(/([-+]?\d+\.?\d*)/)?.[1] || 0),
        signal: data.signal,
        sentiment: parseInt(data.sentimentScore || 0),
        analysis: data.analysis
    };

    // Calcular precio objetivo
    prediction.targetPrice = prediction.initialPrice * (1 + prediction.predictedChange / 100);
    
    // Guardar en localStorage
    let predictions = JSON.parse(localStorage.getItem('cryptoPredictions') || '[]');
    predictions.push(prediction);
    localStorage.setItem('cryptoPredictions', JSON.stringify(predictions));

    showNotification('Predicción guardada. Podrás verificar el resultado en 24 horas.');
}

// Función para verificar predicciones anteriores
async function checkPastPredictions() {
    const predictions = JSON.parse(localStorage.getItem('cryptoPredictions') || '[]');
    const currentTime = new Date().getTime();
    const verifiedPredictions = [];
    let hasVerifiablePredictions = false;

    for (const prediction of predictions) {
        const hoursSincePrediction = (currentTime - prediction.timestamp) / (1000 * 60 * 60);
        
        // Verificar predicciones que tienen entre 23 y 25 horas
        if (hoursSincePrediction >= 23 && hoursSincePrediction <= 25) {
            hasVerifiablePredictions = true;
            try {
                // Obtener precio actual
                const response = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${coinSymbols[prediction.coin]}&tsyms=USD`);
                const data = await response.json();
                const currentPrice = data.USD;

                // Calcular precisión de la predicción
                const actualChange = ((currentPrice - prediction.initialPrice) / prediction.initialPrice) * 100;
                const predictionAccuracy = Math.min(100 - Math.abs(actualChange - prediction.predictedChange), 100);

                verifiedPredictions.push({
                    coin: prediction.coin,
                    initialPrice: prediction.initialPrice,
                    predictedChange: prediction.predictedChange,
                    actualChange: actualChange,
                    accuracy: predictionAccuracy,
                    signal: prediction.signal,
                    timestamp: prediction.timestamp
                });
            } catch (error) {
                console.error('Error verificando predicción:', error);
            }
        }
    }

    if (hasVerifiablePredictions) {
        displayPredictionResults(verifiedPredictions);
    }

    // Limpiar predicciones antiguas (más de 25 horas)
    const updatedPredictions = predictions.filter(p => (currentTime - p.timestamp) / (1000 * 60 * 60) <= 25);
    localStorage.setItem('cryptoPredictions', JSON.stringify(updatedPredictions));
}

// Función para mostrar resultados de predicciones
function displayPredictionResults(verifiedPredictions) {
    const resultsHTML = verifiedPredictions.map(p => `
        <div class="border-b border-gray-800 py-4">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-gray-400 text-xs uppercase tracking-wider">${coinSymbols[p.coin]} - ${new Date(p.timestamp).toLocaleString()}</p>
                    <p class="text-white text-sm mt-1">Predicción: ${p.predictedChange > 0 ? '+' : ''}${p.predictedChange.toFixed(2)}%</p>
                    <p class="text-white text-sm">Real: ${p.actualChange > 0 ? '+' : ''}${p.actualChange.toFixed(2)}%</p>
                </div>
                <div class="text-right">
                    <p class="text-${p.accuracy > 70 ? 'green' : p.accuracy > 40 ? 'yellow' : 'red'}-400 text-sm">
                        Precisión: ${p.accuracy.toFixed(1)}%
                    </p>
                    <p class="text-gray-500 text-xs mt-1">${p.signal}</p>
                </div>
            </div>
        </div>
    `).join('');

    // Crear o actualizar el panel de resultados
    let resultsPanel = document.getElementById('predictionsResults');
    if (!resultsPanel) {
        resultsPanel = document.createElement('div');
        resultsPanel.id = 'predictionsResults';
        resultsPanel.className = 'fixed top-4 right-4 w-96 bg-black border border-gray-800 rounded-lg p-4 shadow-lg';
        document.body.appendChild(resultsPanel);
    }

    resultsPanel.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-white text-sm font-medium">Verificación de Predicciones</h3>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-400">×</button>
        </div>
        ${resultsHTML}
    `;
}

// Función para mostrar notificaciones
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-gray-900 border border-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para mostrar el histórico de predicciones
function showPredictionHistory() {
    const predictions = JSON.parse(localStorage.getItem('cryptoPredictions') || '[]');
    if (predictions.length === 0) {
        showNotification('No hay predicciones guardadas');
        return;
    }

    // Ordenar predicciones por timestamp, más recientes primero
    predictions.sort((a, b) => b.timestamp - a.timestamp);

    // Crear modal para el histórico
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-black border border-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-4">
                    <h3 class="text-white text-lg font-light">Histórico de Predicciones</h3>
                    <button onclick="clearAllPredictions()" class="text-red-500 hover:text-red-400 text-xs uppercase tracking-wider">
                        Limpiar historial
                    </button>
                </div>
                <button class="text-gray-500 hover:text-gray-400" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="grid gap-4" id="predictionsHistory">
                ${predictions.map((p, index) => `
                    <div class="border border-gray-800 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <p class="text-gray-400 text-xs uppercase tracking-wider">${coinSymbols[p.coin]} - ${new Date(p.timestamp).toLocaleString()}</p>
                                <p class="text-white text-lg mt-1">$${p.initialPrice.toFixed(2)}</p>
                                <p class="text-${p.predictedChange >= 0 ? 'green' : 'red'}-400 text-sm">
                                    Predicción: ${p.predictedChange > 0 ? '+' : ''}${p.predictedChange.toFixed(2)}%
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="replayPrediction(${index})" class="text-gray-500 hover:text-gray-300 text-sm border border-gray-800 rounded px-3 py-1">
                                    Ver Gráfico
                                </button>
                                <button onclick="deletePrediction(${index})" class="text-red-500 hover:text-red-400 text-sm border border-red-900 rounded px-3 py-1">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                        <p class="text-gray-500 text-sm mt-2">${p.analysis}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para reproducir una predicción específica
async function replayPrediction(index) {
    const predictions = JSON.parse(localStorage.getItem('cryptoPredictions') || '[]');
    const prediction = predictions[index];
    if (!prediction) return;

    // Recrear los datos necesarios para el gráfico
    const data = {
        currentPrice: prediction.initialPrice.toString(),
        projectedMovement: prediction.predictedChange.toString(),
        signal: prediction.signal,
        sentimentScore: prediction.sentiment.toString(),
        analysis: prediction.analysis
    };

    // Mostrar los resultados y crear el gráfico
    displayResults(data, prediction.coin);
    createChart(prediction.coin, data);
    
    // Cerrar el modal de histórico
    document.querySelector('.fixed.inset-0').remove();
    
    showNotification('Mostrando predicción del ' + new Date(prediction.timestamp).toLocaleString());
}

// Función para eliminar una predicción específica
function deletePrediction(index) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta predicción?')) return;
    
    let predictions = JSON.parse(localStorage.getItem('cryptoPredictions') || '[]');
    predictions.splice(index, 1);
    localStorage.setItem('cryptoPredictions', JSON.stringify(predictions));
    
    // Actualizar la vista
    document.querySelector('.fixed.inset-0').remove();
    showPredictionHistory();
    showNotification('Predicción eliminada');
}

// Función para limpiar todas las predicciones
function clearAllPredictions() {
    if (!confirm('¿Estás seguro de que quieres eliminar todo el historial de predicciones?')) return;
    
    localStorage.setItem('cryptoPredictions', '[]');
    document.querySelector('.fixed.inset-0').remove();
    showNotification('Historial de predicciones eliminado');
}

// Event listener para el botón de histórico
document.getElementById('historyBtn').addEventListener('click', showPredictionHistory);

// Verificar predicciones cada 5 minutos
setInterval(checkPastPredictions, 5 * 60 * 1000);
// Verificar al cargar la página
checkPastPredictions();

const coinSymbols = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'solana': 'SOL'
};

const coinNames = {
    'bitcoin': 'Bitcoin',
    'ethereum': 'Ethereum',
    'solana': 'Solana'
};

let socket = null;
let lastCandle = null;

// Configuración base del gráfico
const chartOptions = {
    chart: {
        type: 'candlestick',
        height: 600,
        foreColor: '#9ca3af',
        animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 300,
        },
        toolbar: {
            show: true,
            tools: {
                download: false,
                selection: true,
                zoom: true,
                zoomin: true,
                zoomout: true,
                pan: true,
                reset: true
            },
            autoSelected: 'zoom'
        },
        background: '#000000',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    plotOptions: {
        candlestick: {
            colors: {
                upward: '#059669',
                downward: '#dc2626'
            },
            wick: {
                useFillColor: true,
            }
        }
    },
    stroke: {
        width: 1
    },
    grid: {
        borderColor: '#1a1a1a',
        strokeDashArray: 3,
        position: 'back',
        xaxis: {
            lines: {
                show: true,
                opacity: 0.05
            }
        },
        yaxis: {
            lines: {
                show: true,
                opacity: 0.05
            }
        }
    },
    xaxis: {
        type: 'datetime',
        labels: {
            style: {
                colors: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500
            },
            datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM',
                day: 'dd',
                hour: 'HH:mm'
            }
        },
        axisBorder: {
            color: '#4b5563'
        },
        axisTicks: {
            color: '#4b5563'
        },
        crosshairs: {
            stroke: {
                color: '#6366f1',
                width: 1,
                dashArray: 0
            }
        },
        tooltip: {
            enabled: true
        }
    },
    yaxis: {
        labels: {
            style: {
                colors: '#9ca3af',
                fontSize: '12px',
                fontWeight: 500
            },
            formatter: function (value) {
                return '$' + value.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        },
        axisBorder: {
            show: true,
            color: '#4b5563'
        },
        tickAmount: 6
    },
    tooltip: {
        theme: 'dark',
        style: {
            fontSize: '12px',
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        x: {
            format: 'dd MMM HH:mm',
            show: true
        },
        y: {
            formatter: function (value) {
                if (Array.isArray(value)) {
                    return `O: $${value[0].toFixed(2)} H: $${value[1].toFixed(2)} L: $${value[2].toFixed(2)} C: $${value[3].toFixed(2)}`;
                }
                return `$${value.toFixed(2)}`;
            }
        }
    },
    annotations: {
        position: 'front',
        style: {
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif'
        }
    }
};

// Función para obtener datos históricos de CryptoCompare
async function getHistoricalData(symbol, limit = 100) {
    const response = await fetch(`https://min-api.cryptocompare.com/data/v2/histominute?fsym=${symbol}&tsym=USD&limit=${limit * 15}&aggregate=15`);
    const data = await response.json();
    return data.Data.Data.map(d => ({
        x: new Date(d.time * 1000).getTime(),
        y: [d.open, d.high, d.low, d.close]
    }));
}

// Función para conectar al WebSocket
function connectWebSocket(symbol) {
    if (socket) {
        socket.close();
    }

    socket = new WebSocket('wss://streamer.cryptocompare.com/v2?api_key=YOUR_API_KEY');

    socket.onopen = function () {
        const subRequest = {
            "action": "SubAdd",
            "subs": [`2~Binance~${symbol}~USD`]
        };
        socket.send(JSON.stringify(subRequest));
    };

    socket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.TYPE === "2" && chart) { // 2 = trade data
            updateChartData(data);
        }
    };

    socket.onerror = function (error) {
        console.error('WebSocket Error:', error);
    };
}

// Función para actualizar datos en tiempo real
function updateChartData(data) {
    const timestamp = new Date().getTime();
    const price = parseFloat(data.P); // Precio actual

    if (!lastCandle || timestamp - lastCandle.x >= 900000) { // Nueva vela cada 15 minutos (15 * 60 * 1000 ms)
        lastCandle = {
            x: timestamp - (timestamp % 900000), // Redondear a 15 minutos
            y: [price, price, price, price] // [open, high, low, close]
        };
        chart.appendData([{
            data: [lastCandle]
        }]);
    } else {
        lastCandle.y[1] = Math.max(lastCandle.y[1], price); // Actualizar high
        lastCandle.y[2] = Math.min(lastCandle.y[2], price); // Actualizar low
        lastCandle.y[3] = price; // Actualizar close

        chart.updateSeries([{
            data: chart.w.config.series[0].data.map(candle =>
                candle.x === lastCandle.x ? lastCandle : candle
            )
        }]);
    }
}

document.getElementById('analyzeBtn').addEventListener('click', async function () {
    const selectedCoin = document.getElementById('coinSelect').value;
    const btn = this;
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    // Show loading state
    btn.disabled = true;
    btnText.textContent = 'Analizando...';
    btnSpinner.classList.remove('hidden');

    // Hide previous results
    document.getElementById('resultsPanel').classList.add('hidden');
    document.getElementById('errorPanel').classList.add('hidden');

    try {
        const response = await fetch('http://localhost:5678/webhook/45ec9f4b-c579-42f3-84db-cd4d9267b647', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                moneda: selectedCoin
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        analysisData = data;

        displayResults(data, selectedCoin);
        createChart(selectedCoin, data);

    } catch (error) {
        console.error('Error:', error);
        showError('No se pudo conectar con el servidor de análisis. Verifica que el webhook esté activo.');
    } finally {
        btn.disabled = false;
        btnText.textContent = '🎯 Analizar Criptomoneda';
        btnSpinner.classList.add('hidden');
    }
});

function displayResults(data, coin) {
    const signal = data.signal || 'No disponible';
    const currentPrice = `$${data.currentPrice || '0.00'}`;
    const movement24h = parseFloat(data.movement24h || 0);
    const projectedMovement = data.projectedMovement || 'No disponible';
    const sentimentScore = parseInt(data.sentimentScore || 0);
    const recentNews = data.recentNews || 0;
    const analysis = data.analysis || 'Análisis no disponible';

    document.getElementById('tradingSignal').textContent = signal;
    document.getElementById('currentPrice').textContent = currentPrice;

    const priceChangeElement = document.getElementById('priceChange');
    const changeText = `${movement24h > 0 ? '+' : ''}${movement24h}% (24h)`;
    priceChangeElement.textContent = changeText;
    priceChangeElement.className = movement24h >= 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm';

    document.getElementById('prediction').textContent = projectedMovement;
    document.getElementById('detailedAnalysis').textContent = analysis;

    const sentimentElement = document.getElementById('sentimentScore');
    sentimentElement.textContent = sentimentScore;
    if (sentimentScore > 0) {
        sentimentElement.className = 'font-bold text-green-400';
    } else if (sentimentScore < 0) {
        sentimentElement.className = 'font-bold text-red-400';
    } else {
        sentimentElement.className = 'font-bold text-yellow-400';
    }

    document.getElementById('newsCount').textContent = recentNews;

    const confidenceBadge = document.getElementById('confidenceBadge');
    if (signal.includes('Alta')) {
        confidenceBadge.textContent = 'Alta Confianza';
        confidenceBadge.className = 'ml-3 px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white';
    } else if (signal.includes('Media')) {
        confidenceBadge.textContent = 'Media Confianza';
        confidenceBadge.className = 'ml-3 px-3 py-1 rounded-full text-sm font-medium bg-yellow-600 text-white';
    } else {
        confidenceBadge.textContent = 'Baja Confianza';
        confidenceBadge.className = 'ml-3 px-3 py-1 rounded-full text-sm font-medium bg-gray-600 text-white';
    }

    document.getElementById('resultsPanel').classList.remove('hidden');
}

async function createChart(coin, data) {
    if (chart) {
        chart.destroy();
    }

    const symbol = coinSymbols[coin];
    const currentTime = new Date();
    const currentPrice = parseFloat(data.currentPrice || 0);
    const projectedChange = parseFloat(data.projectedMovement?.match(/([-+]?\d+\.?\d*)/)?.[1] || 0);
    const projectedPrice = currentPrice * (1 + projectedChange / 100);
    
    // Guardar la predicción cuando se crea el gráfico
    savePrediction(coin, data);
    const projectionTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);

    try {
        // Obtener datos históricos
        const historicalData = await getHistoricalData(symbol);

        // Configurar series de datos
        const series = [{
            name: `${coinNames[coin]} Precio`,
            data: historicalData
        }];

        // Configurar anotaciones
        const annotations = {
            xaxis: [{
                x: currentTime.getTime(),
                borderColor: '#404040',
                label: {
                    text: 'Análisis',
                    style: {
                        background: '#000000',
                        color: '#666666',
                        fontSize: '11px'
                    }
                },
                strokeDashArray: 0,
                borderWidth: 1,
                position: 'back'
            }],
            yaxis: [{
                y: projectedPrice,
                borderColor: projectedChange >= 0 ? '#22c55e' : '#f97316',
                strokeDashArray: 5,
                label: {
                    text: `Proyección: $${projectedPrice.toFixed(2)} (${projectedChange >= 0 ? '+' : ''}${projectedChange.toFixed(1)}%)`,
                    style: {
                        background: '#1f2937',
                        color: '#ffffff'
                    }
                }
            }]
        };

        // Crear el gráfico
        const options = {
            ...chartOptions,
            series: series,
            annotations: annotations
        };

        chart = new ApexCharts(document.querySelector("#tradingChart"), options);
        await chart.render();

        // Conectar WebSocket para datos en tiempo real
        connectWebSocket(symbol);
    } catch (error) {
        console.error('Error creating chart:', error);
        showError('Error al cargar el gráfico de precios');
    }

    updateTimeInfo(currentTime, new Date(currentTime.getTime() + 86400000), projectedChange);
}

function updateTimeInfo(analysisTime, projectionTime, change) {
    const timeInfo = document.createElement('div');
    timeInfo.className = 'mt-2 text-sm text-gray-400 bg-gray-800 p-3 rounded-lg';
    timeInfo.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <span class="text-red-400">●</span> Análisis: ${analysisTime.toLocaleString('es-ES')}
                        </div>
                        <div>
                            <span class="text-${change >= 0 ? 'green' : 'orange'}-400">●</span> 
                            Proyección 24h: ${projectionTime.toLocaleString('es-ES')} 
                            (${change >= 0 ? '+' : ''}${change.toFixed(1)}%)
                        </div>
                    </div>
                `;

    const existingInfo = document.querySelector('.time-info');
    if (existingInfo) {
        existingInfo.remove();
    }

    timeInfo.classList.add('time-info');
    document.getElementById('tradingview_chart').parentNode.appendChild(timeInfo);
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorPanel').classList.remove('hidden');
}