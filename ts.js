var ts_data_file = "temp.tsv";

var margin = {top: 20, right: 20, bottom: 30, left: 40},
width = 960 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

var x_ts = d3.scaleTime().range([0, width]),
    y_ts = d3.scaleLinear().range([height, 0]);

var color = d3.scaleOrdinal(d3.schemeCategory20);

var xAxis = d3.axisBottom(x_ts),
    yAxis = d3.axisLeft(y_ts);

var svg_ts = d3.select("#scatter").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var line = d3.line()
    .curve(d3.curveBasis)
    .x(function(d) { return x_ts(d.date); })
    .y(function(d) { return y_ts(d.temp); })

// var parseTime = d3.timeParse("%e-%b-%y");
var parseTime = d3.timeParse("%Y%m%d");


d3.tsv(ts_data_file, setType, function(error, data) {
    if (error) throw error;

    var cities = data.columns.slice(1).map(function(id) {
	return {
	    id: id,
	    values: data.map(function(d) {
		return {date: d.date, temperature: d[id]};
	    })
	};
    });

    // data.forEach(function(d) {
    // 	d.date = parseTime(d.date);
    // 	d.close = parseInt(d.close);
    // });
    // console.log(data);
    
    x_ts.domain(d3.extent(data, function(d) { return d.date; })).nice(d3.timeMonth);
    y_ts.domain(d3.extent(data, function(d) { return d.close; })).nice();

    svg_ts.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis)
	.append("text")
	.attr("class", "label")
	.attr("x", width)
	.attr("y", -6)
	.style("text-anchor", "end")
	.text("Sepal Width (cm)");

    svg_ts.append("g")
	.attr("class", "y axis")
	.call(yAxis)
	.append("text")
	.attr("class", "label")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", ".71em")
	.style("text-anchor", "end")
	.text("Sepal Length (cm)");

    svg_ts.selectAll(".dot")
	.data(data)
	.enter().append("circle")
	.attr("class", "dot")
	.attr("r", 3.5)
	.attr("cx", function(d) { return x_ts(d.date); })
	.attr("cy", function(d) { return y_ts(d.close); })
	.style("fill", function(d) { return color(d.date.getYear()); });

    var legend = svg_ts.selectAll(".legend")
	    .data(color.domain())
	    .enter().append("g")
	    .attr("class", "legend")
	    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
	.attr("x", width - 18)
	.attr("width", 18)
	.attr("height", 18)
	.style("fill", color);

    legend.append("text")
	.attr("x", width - 24)
	.attr("y", 9)
	.attr("dy", ".35em")
	.style("text-anchor", "end")
	.text(function(d) { return d; });

});

function setType(d, _, columns) {
    d.date = parseTime(d.date);
    for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
    return d;
}
