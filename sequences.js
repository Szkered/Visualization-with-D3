var data_file = "flare.json";

// Dimensions of sunburst.
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

var x = d3.scaleLinear().range([0, 2 * Math.PI]);
var y = d3.scaleSqrt().range([0, radius]);

// Breadcrumb dimensions: height, spacing, width of tip/tail.
var b = {
    h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
// var colors = d3.scaleOrdinal(d3.schemeCategory20);
var colors = d3.scaleOrdinal()
    .range(["#5687d1","#7b615c","#de783b","#6ab975","#a173d1","#bbbbbb"]);

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var svg = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition();

// var arc = d3.arc()
//     .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
//     .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
//     .innerRadius(function(d) { return Math.max(0, (d.y0)); })
// 	.outerRadius(function(d) { return Math.max(0, (d.y1)); });

var arc = d3.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y1)); });

var default_root_string = "of all transaction";
var current_root_string = default_root_string;
var current_depth = 1;
var current_root = null;

var FILTER_THREASHOLD = 0.0001;
var nodes = null;
var display_mode = "size";


// Main function to draw and set up the visualization, once we have the data.
d3.json(data_file, function(error, root){
    if (error) throw error;


    // Basic setup of page elements.
    initializeBreadcrumbTrail();
    // d3.select("#togglelegend").on("click", toggleLegend);

    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    svg.append("svg:circle")
	.attr("r", radius)
	.style("opacity", 0);

    root = d3.hierarchy(root);
    root.sum(function(d) { return d.size; });
    current_root = root;


    // partition
    // 	.value(function() { return 1; })
    // 	.nodes(root)
    // 	.forEach(function(d) {
    // 	    d.count = d.value;
    // 	    d.x0 = d.x;
    // 	    d.dx0 = d.dx;
    // 	    d.fill = computeFill(d);
    // 	    d.width = getTextWidth(d.name, "Open Sans 12pt");
    // 	});
    
    // For efficiency, filter nodes to keep only those large enough to see.
    // nodes = partition
    // 	.value(function(d) {return d.size; })
    // 	.nodes(root)
    // 	.filter(function(d) {
    // 	    return (d.dx > FILTER_THREASHOLD);
    // 	});
    // drawLegend(nodes[0]);
    nodes = partition(root).descendants()
	.filter(function(d) { return ((d.x1-d.x0) > FILTER_THREASHOLD); });
    nodes.forEach(function(d) {
	d.name = d.data.name;
	d.fill = computeFill(d);
	d.width = getTextWidth(d.name, "Open Sans 12pt");
    });
    console.log(nodes);
    

    var path = svg.selectAll("path")
	    .data(nodes)
	    .enter().append("svg:path")
	    .attr("display", function(d) { return d.depth ? "true" : "none"; })
	    .attr("d", arc)
	    .attr("fill-rule", "evenodd")
	    .style("fill", function(d) { return d.fill; })
	    .style("opacity", function(d) { return d.depth ? 1 : 0; })
	    .on("mouseover", mouseover)
	    .on("click", click);

    // Add the mouseleave handler to the bounding circle.
    d3.select("#container").on("mouseleave", mouseleave);

    // Add an invisible circle at the center to go back to the previous level
    var center = svg.append("circle")
    	.attr("r", radius / 2.6)
    	.attr("fill", "#fff")
    	.on("click", function() {
    	    click(current_root.parent ? current_root.parent : current_root);
    	});

    // Get total size of the tree = value of root node from partition.
    totalSize = path.node().__data__.value;

    function click(d) {
	current_root = d;
	current_depth = d.depth;
	totalSize = display_mode === "size"
	    ? d.value
	    : d.count;

	// path.data(nodes)
	svg
	    .transition()
	    .duration(1500)
	    .tween("scale", function() {
		var xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
		    yd = d3.interpolate(y.domain(), [d.y0 * d.y0, 1]),
		    yr = d3.interpolate(y.range(), [d.y0 ? 20 : 0, radius]);
		return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
	    })
	    .selectAll("path")
	    .attr("display", function(d) { return d.depth >= current_root.depth && d.depth !== 0
	    				   ? "true"
	    				   : "none";})
	    .attrTween("d", function(d) { return function() { return arc(d); }; });
    };
});

// function arcTween(d) {
//     var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
// 	yd = d3.interpolate(y.domain(), [d.y * d.y, 1]),
// 	yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
//     return function(d, i) {
// 	return i
// 	    ? function(t) { return arc(d); }
// 	: function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
//     };
// }

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
    var volumeString = display_mode === "size"
	    ? Number((d.value / 1000000).toFixed(2)) + "M"
	    : d.count;
    var percentage = display_mode === "size"
	    ? (100 * d.value / totalSize).toPrecision(3)
    	    : (100 * d.count / totalSize).toPrecision(3);
    var percentageString = percentage + "%";
    if (percentage < 0.1) {
	percentageString = "< 0.1%";
    }

    d3.select("#percentage")
	.text(percentageString);

    d3.select("#explanation")
	.style("visibility", "");

    var sequenceArray = getAncestors(d);
    updateBreadcrumbs(sequenceArray, percentageString, volumeString);

    // Fade all the segments.
    d3.selectAll("path")
	.style("opacity", 0.3);

    // Then highlight only those that are an ancestor of the current segment.
    svg.selectAll("path")
	.filter(function(node) {
            return (sequenceArray.indexOf(node) >= 0);
        })
	.style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

    // Hide the breadcrumb trail
    d3.select("#trail")
	.style("visibility", "hidden");

    // Deactivate all segments during transition.
    d3.selectAll("path").on("mouseover", null);

    // Transition each segment to full opacity and then reactivate it.
    d3.selectAll("path")
	.transition()
	.duration(1000)
	.style("opacity", 1)
	.on("end", function() {
            d3.select(this).on("mouseover", mouseover);
        });

    d3.select("#explanation")
	.style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
	path.unshift(current);
	current = current.parent;
    }
    return path;
}

function initializeBreadcrumbTrail() {
    // Add the svg area.
    var trail = d3.select("#sequence").append("svg:svg")
	.attr("width", width+500) // to avoid overflow
	.attr("height", 50)
	.attr("id", "trail");
    // Add the label at the end, for the percentage.
    trail.append("svg:text")
	.attr("id", "endlabel")
	.style("fill", "#000");
}

function getTextWidth(text, font) {
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font;
    var metrics = context.measureText(text);
    return metrics.width + 50; // pad the width for display
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
    // d.b = b;
    // d.b.w = getTextWidth(d.name, "Open Sans 12pt");
    var points = [];
    points.push("0,0");
    points.push(d.width + ",0");
    points.push(d.width + b.t + "," + (b.h / 2));
    points.push(d.width + "," + b.h);
    points.push("0," + b.h);
    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
	points.push(b.t + "," + (b.h / 2));
    }
    return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString, volumeString) {
    var lengthArray = nodeArray.map(function(d) { return d.width; });
    
    // Data join; key function combines name and depth (= position in sequence).
    var g = d3.select("#trail")
	.selectAll("g")
	.data(nodeArray, function(d) { return d.name + d.depth; });
    // console.log(g);

    // Add breadcrumb and label for entering nodes.
    var entering = g.enter().append("svg:g");

    entering.append("svg:polygon")
	.attr("points", breadcrumbPoints)
	.style("fill", function(d) { return d.fill; });

    entering.append("svg:text")
	.attr("x", function(d, i) { return (lengthArray[i] + b.t) / 2; })
	.attr("y", b.h / 2)
	.attr("dy", "0.35em")
	.attr("text-anchor", "middle")
	.style("fill", computeTextColor)
	.text(function(d) { return d.name; });
    
    // Set position for entering and updating nodes.
    entering.attr("transform", function(d, i) {
	var translation = i * b.s + lengthArray.slice(0, i).reduce(add, 0);
	return "translate(" + translation + ", 0)";
    });

        // Remove exiting nodes.
    g.exit().remove();

    // Now move and update the percentage at the end.
    var percentage_translation = lengthArray.reduce(add, 0) + lengthArray.length * b.s + 60;
    d3.select("#trail").select("#endlabel")
	.attr("x", percentage_translation)
	.attr("y", b.h / 2)
	.attr("dy", "0.35em")
	.attr("text-anchor", "middle")
	.text(percentageString);

    // Make the breadcrumb trail visible, if it's hidden.
    d3.select("#trail")
	.style("visibility", "");

}

function drawLegend() {

    // Dimensions of legend item: width, height, spacing, radius of rounded rect.
    var li = {
	w: 75, h: 30, s: 3, r: 3
    };

    var legend = d3.select("#legend").append("svg:svg")
	.attr("width", li.w)
	.attr("height", d3.keys(colors).length * (li.h + li.s));

    var g = legend.selectAll("g")
	.data(d3.entries(colors))
	.enter().append("svg:g")
	.attr("transform", function(d, i) {
            return "translate(0," + i * (li.h + li.s) + ")";
        });

    g.append("svg:rect")
	.attr("rx", li.r)
	.attr("ry", li.r)
	.attr("width", li.w)
	.attr("height", li.h)
	.style("fill", function(d) { return d.value; });

    g.append("svg:text")
	.attr("x", li.w / 2)
	.attr("y", li.h / 2)
	.attr("dy", "0.35em")
	.attr("text-anchor", "middle")
	.text(function(d) { return d.key; });
}

function toggleLegend() {
    var legend = d3.select("#legend");
    if (legend.style("visibility") == "hidden") {
	legend.style("visibility", "");
    } else {
	legend.style("visibility", "hidden");
    }
}

function computeTextColor(d) {
    var hex = colors((d.children ? d : d.parent).name);
    var yiq = computeYIQ(hex);
    var yiq_white = computeYIQ("#ffffff");
    var yiq_diff = Math.abs(yiq - yiq_white);
    var color_diff = computeColorDiff("#ffffff", hex);

    if(yiq_diff > 125 || color_diff > 500) {
	return "#fff";
    } else {
	return "#1B1B1B";
    }
}

function hex2rgb(hex) {
    var rgb_hex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return rgb_hex ? {
	r: parseInt(rgb_hex[1], 16),
	g: parseInt(rgb_hex[2], 16),
	b: parseInt(rgb_hex[3], 16)
    } : null;
}

function computeYIQ(hex) {
    var rgb = hex2rgb(hex);
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}


function computeColorDiff(hex1, hex2) {
    var rgb1 = hex2rgb(hex1);
    var rgb2 = hex2rgb(hex2);
    return Math.abs(rgb1.r-rgb2.r) + Math.abs(rgb1.g-rgb2.g) + Math.abs(rgb1.b-rgb2.b);
}

function computeFill(d) {
    return current_depth >=1
	? colors(d.data.name)
	: colors((d.children ? d : d.parent).data.name);
}

function add(a, b){
    return a+b;
}
