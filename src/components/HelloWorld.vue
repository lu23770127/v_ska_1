@using Nana_s_Babe.Entity
@using Newtonsoft.Json
@model Nana_s_Babe.ViewModels.DataDiagramViewModel
<script src="~/lib/apexcharts.js"></script>
<script src='https://unpkg.com/vue/dist/vue.js'></script>
<script src='https://unpkg.com/v-calendar@next'></script>
<script src="https://rawgit.com/moment/moment/2.2.1/min/moment.min.js"></script>

<div class="card text-white bg-primary mb-3">
    <div class="card-header">
        <h4 class="card-title">ONLINE GAME PREDICT GRAPH</h4>
    </div>
    <div class="card-body">
                    <img src="~/images/left.png" width="15px" height="15px" onclick="selectDate('-')">

        <h4 class="card-title">@Model.Prediction[0][0].ToString("yyyy/MM/dd") ~ @Model.Prediction[@Model.Prediction.Count - 1][0].ToString("yyyy/MM/dd")</h4>
                        <img src="~/images/right.png" width="15px" height="15px" id="nextDay" onclick="selectDate('+')">

        <form class="form-inline my-2 my-lg-0" id="datePicker">
            <div>
                <v-date-picker v-model='myDate'
                               color="blue"
                               is-dark
                               :max-date="new Date()"
                               :input-props='{
                    class: "form-control mr-sm-3",
                    placeholder: "Search date...",
                    readonly: false,
                }' />
            </div>
            <button class="btn btn-secondary my-2 my-sm-0" type="submit" onclick="GetSearchTimeData()">Search</button>
        </form>
        <div align="right">
            <span class="badge badge-pill badge-success"> 1 hour Synchronize </span>
        </div>
        <div id="chart"></div>
    </div>
</div>

<script>
    //Date Picker
    var date = new Vue({
        el: '#datePicker',
        data: {
            myDate:""
        }
    });
    function GetSearchTimeData() {
        $.ajax({
            type: "GET",
            url: "/DataDiagram/GetHistoryData",
            data: { Time: moment(date.myDate).format('l')},
            success: function() {
                alert(`searching : ${moment(date.myDate).format('l')}`);
            },
            dataType: 'json'
        });
    }

    //Apexchart
    var alert_data = @(Html.Raw(JsonConvert.SerializeObject(Model.Alert)));
    var actual_data = @(Html.Raw(JsonConvert.SerializeObject(Model.Actual)));
    var prediction_data = @(Html.Raw(JsonConvert.SerializeObject(Model.Prediction)));
    var null_for_actual =@(Html.Raw(JsonConvert.SerializeObject(Model.Prediction)));


    for (var i = actual_data.length; i < null_for_actual.length; i++) {
        actual_data.push(null_for_actual[i]);
        actual_data[i][1] = null;
    }

    var options = {
        colors: ['#009aff', '#ffe500'],
        series: [
            {
                name: 'Actual',
                data: actual_data
            }, {
                name: 'Predict',
                data: prediction_data
            }
        ],
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
            }
        },
        yaxis: {
            labels: {
                formatter: function(num) {
                    if (num != null) {
                        var parts = num.toString().split('.');
                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        return parts.join('.');
                    }
                }
            }
        },
        chart: {
            foreColor: '#fff',
            fontFamily: 'Century Gothic, Arial, sans-serif',
            height: 600,
            type: 'line',
            animations: {
                enabled: true,
                speed: 900,
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            },
        },
        markers: {
            size: 0,
            hover: {
                sizeOffset: 7
            }
        },
        stroke: {
            width: [4, 4],
            curve: 'straight'
        },
        noData: {
            text: 'Loading...'
        },
        tooltip: {
            custom: function({ series, dataPointIndex }) {
                var actual = series[0][dataPointIndex];
                var predict = series[1][dataPointIndex];
                var differ = (((actual - predict) / predict) * 100).toFixed(2);
                var actualComma = actual;
                var predictComma = predict.toString().split('.');
                predictComma[0] = predictComma[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                predictComma.join('.');
                if (actual != null) {
                    actualComma = actual.toString().split('.');
                    actualComma[0] = actualComma[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                    actualComma.join('.');
                } else {
                    differ = '0';
                }
                return (
                    `<div class="arrow_box">
                        <span>
                            Actual  ： ${actualComma}<br>
                            Predict ： ${predictComma}<br>
                            Differ  ： ${differ} %
                        </span>
                    </div>`
                );
            },
            x: {
                show: true,
                format: 'MM/dd HH:mm'
            },
            followCursor: true,
            shared: true
        },
        grid: {
            row: {
                colors: ['#919aa1', 'transparent'],
                opacity: 0.05
            }
        },
        legend: {
            offsetY: 5,
        }
    };
    var chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();

    //Update Timer
    setInterval(function() {
        var currentMinute = new Date($.now()).getMinutes();
        var isTodayData = testIsTodayData();
        if ((Math.abs(currentMinute - 30) < 5) && isTodayData) {
            GetRealTimeData();
        }
    }, 60000); //1000: 1 second

    function testIsTodayData() {
        var currentDate = new Date($.now());
        var todayStartTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 5, 30, 0);
        var dataStartTime = new Date(prediction_data[0][0]);
        if (currentDate < todayStartTime) {
            todayStartTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()-1, 5, 30, 0);
        }
        return dataStartTime.getTime() === todayStartTime.getTime();
    }

    function GetRealTimeData() {
        $.ajax({
            type: "POST",
            url: "/DataDiagram/GetCurrentData",
            async: true,
            dataType: "json",
            success: successfunction,
            error: errorfunction
        });
    }

    function successfunction(getData) {
        actual_data = getData["actual"];
        prediction_data = getData["prediction"];
        alert_data = getData["alert"];
        AddPoint(alert_data);
        for (var i = actual_data.length; i < null_for_actual.length; i++) {
            actual_data.push(null_for_actual[i]);
            actual_data[i][1] = null;
        }
        chart.updateSeries([
            {
                data: actual_data
            },
            {
                data: prediction_data
            }
        ]);
    }

    function errorfunction() {
        alert("Server not request");
    }

    window.onload = AddPoint();

    function AddPoint() {
        for (var j = 0; j < alert_data.length; j++) {
            var percent = alert_data[j][1] * 100;
            if (percent >= 10) {
                chart.addPointAnnotation({
                    x: new Date(alert_data[j][0]).getTime(),
                    y: alert_data[j][2],
                    marker: {
                        fillColor: '#00b347',
                        strokeColor: '#008033'
                    },
                    label: {
                        borderColor: '#00b347',
                        style: {
                            color: '#fff',
                            background: '#00b347'
                        },
                        text: Math.abs(percent.toFixed(0)) + ' % '
                    }
                });
            } else if (percent <= -10) {
                chart.addPointAnnotation({
                    x: new Date(alert_data[j][0]).getTime(),
                    y: alert_data[j][2],
                    marker: {
                        fillColor: '#ff001a',
                        strokeColor: '#b30012'
                    },
                    label: {
                        borderColor: '#ff001a',
                        style: {
                            color: '#fff',
                            background: '#ff001a'
                        },
                        text: Math.abs(percent.toFixed(0)) + ' % ',
                        offsetY: 50
                    }
                });
            }
        }
    }
</script>