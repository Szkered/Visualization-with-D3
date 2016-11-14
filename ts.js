var ts_data_file = "temp.tsv";

var margin = {top: 20, right: 20, bottom: 30, left: 40},
width = 760 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

var x_ts = d3.scaleTime().range([0, width]),
    y_ts = d3.scaleLinear().range([height, 0]);

var color = d3.scaleOrdinal(d3.schemeCategory20);

var svg_ts = d3.select("#ts").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var line = d3.line()
    // .curve(d3.curveBasis)
    .x(function(d) { return x_ts(d.date); })
    .y(function(d) { return y_ts(d.val); })

// var parseTime = d3.timeParse("%e-%b-%y");
var parseTime = d3.timeParse("%Y%m%d");


d3.tsv(ts_data_file, setType, function(error, data) {
    if (error) throw error;
    
    var val_cols = data.columns.slice(1);
    var ts_list = val_cols.map(function(val_col) {
	return {
	    id: val_col,
	    values: data.map(function(d) {
		return {date: d.date, val: d[val_col]};
	    })
	};
    });

    var data_points = [].concat.apply([], data.map(function(d) {
	return val_cols.map(function(val_col) {
	    return {id: val_col, date: d.date, val: d[val_col]}
	});
    }));
    
    x_ts.domain(d3.extent(data, function(d) { return d.date; })).nice(d3.timeMonth);
    y_ts.domain([
	0.8 * d3.min(ts_list,
	       function(c) { return d3.min(c.values, function(d) { return d.val; }); }),
	1.1 * d3.max(ts_list,
	       function(c) { return d3.max(c.values, function(d) { return d.val; }); })
    ]);
    // y_ts.domain(d3.extent(data, function(d) { return d.close; })).nice();

    svg_ts.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(d3.axisBottom(x_ts));

    svg_ts.append("g")
	.attr("class", "y axis")
	.call(d3.axisLeft(y_ts))
	.append("text")
	.attr("class", "label")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", ".71em")
	.attr("fill", "#000")
	.style("text-anchor", "end")
	.text("Value");

    svg_ts.selectAll(".dot")
	.data(data_points)
	.enter().append("circle")
	.attr("class", "dot")
	.attr("r", 3.5)
	.attr("cx", function(d) { return x_ts(d.date); })
	.attr("cy", function(d) { return y_ts(d.val); })
	// .style("fill", "#DEDEDE")
	.style("fill", function(d) { return color(d.id); })
    	.on("mouseover", mouseover_ts)
        .on("mouseleave", mouseleave_ts);


    svg_ts.selectAll(".lines")
	.data(ts_list)
	.enter().append("g")
	.attr("class", "lines")
	.append("path")
	.attr("class", "line")
	.attr("d", function(d) { return line(d.values); })
    	.style("opacity", 0.3)
	.style("stroke", function(d) { return color(d.id); });
    
    var legend = d3.select("#legend").append("svg")
	.selectAll("#legend")
    	.data(color.domain())
    	.enter().append("g")
    	.attr("class", "legend")
    	.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
    	.attr("x", 18)
    	.attr("width", 18)
    	.attr("height", 18)
    	.style("fill", color);

    legend.append("text")
    	.attr("x", 45)
    	.attr("y", 9)
    	.attr("dy", ".35em")
    	// .style("text-anchor", "end")
    	.text(function(d) { return d; });

});

function setType(d, _, columns) {
    d.date = parseTime(d.date);
    for (var i = 1, n = columns.length, c; i < n; ++i) d[c = columns[i]] = +d[c];
    return d;
}

function mouseover_ts(d) {
    svg_ts.selectAll(".dot")
	.filter(function(node) {
	    return node === d;
	})
	.style("border-style", "solid");
}

function mouseleave_ts(d) {
    // Deactivate all segments during transition.
    svg_ts.selectAll(".dot")
	.filter(function(node) {
	    return node === d;
	})
	.on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    svg_ts.selectAll(".dot")
	.filter(function(node) {
	    return node === d;
	})
	.transition()
	.duration(1000)
	.style("border-style", "none")
	.on("end", function() {
            d3.select(this).on("mouseover", mouseover_ts);
        });
}
