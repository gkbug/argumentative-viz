var width1 = 700,height1 = 400;
var width2 = 620,height2 = 500;
var margin = {top: 100, right: 70, bottom: 40, left: 50}
var count_data = []
var svg1, tip, text
var selected = "Broader Protection"
const options = {
    "Constitutional Protection": "CONST.",
    "Broad Protection":"BROAD PROT.",
    "Hate Crime":"HATE CRIME","Incitement":"INCITEMENT",
    "Ban Conversion Therapies":"BAN CONV. THERAPIES",
    "Same Sex marriage":"SAME SEX MARRIAGE"}
const opac_0 = 0.0, opac_1 = 1.0
const map_scale = 110

document.addEventListener('DOMContentLoaded', function () {

    // Create Tooltip
    tip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style('padding', '10px')
    .style("opacity", opac_0)
    
    //Apppend SVGS for the 2 viz
    svg1 = d3.select("#viz1")
          .select("svg")
          .attr("width", width1 )
          .attr("height", height1)
          .attr("margin-top", margin.top)
    
    var svg2 = d3.select("#viz2")
            .select("svg")
            .attr("width", width2)
            .attr("height", height2)
            .append("g")
            .attr("transform","translate(" + margin.left + "," + margin.bottom + ")")
    
    // Generate georectangular projections
    var proj = d3.geoEquirectangular()
        .scale(map_scale)
        .translate([width1 / 2, height1 / 2]);

    var g_path = d3.geoPath().projection(proj);
    
    Promise.all([d3.json('lib/world-topo.json'), d3.csv('data/data.csv')])
    .then(function (values) {
        count_data = values[0]
        legal_data = values[1]
    
        // Wrangle the data for line chart
        decriminal_years = legal_data.reduce((g, d) => {
            let year = d['DATE OF DECRIM']
            if(year == "" || year =="-") {
                return g;
            }  else if(year=="NEVER CRIM") {
                year='1790'
            } else if(year.includes("-")) {
                year=(year.split('-')[1])
            }
            let x = parseInt(year)
            x = x-x%10;
            year = String(x)
            if (!g[year]) {
                g[year] = [];
            }
            g[year].push(d);
            return g;
        }, {});

        let count = 0;
        decriminal_years = Object.keys(decriminal_years).map((year) => {
            count+=decriminal_years[year].length
                return { key:year,value:decriminal_years[year],count:count,orig_count:decriminal_years[year].length};
        });

        // Plot the Axes for the line chart
        start = d3.timeParse("%Y")("1780")
        end = d3.timeParse("%Y")("2020")
    
        let x_axis = d3.scaleTime().domain([start, end]).range([0, width2-margin.right]);

        svg2.append("g")
        .attr("transform", "translate(0," + (height2-100) + ")")
        .call(d3.axisBottom(x_axis))

        let y_axis = d3.scaleLinear().domain([0,d3.max(decriminal_years.map(d=> {return d.count}))+10 ]).range([height2-margin.top, 0]);
        svg2.append("g").call(d3.axisLeft(y_axis));

        // Plot the axis labels
        svg2.append("text")
        .attr("text-anchor", "end")
        .attr("x", width2/2)
        .attr("y", height2 - 60)
        .text("Years");

        svg2.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("x", -150)
        .attr("y", -45)
        .attr("dy", "0.75em")
        .attr("transform", "rotate(-90)")
        .text("No. of countries");

        // plot the line chart
        svg2.append("path")
            .datum(decriminal_years)
            .attr("fill", "none")
            .attr("stroke", "orange")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
            .x(function(d) { return x_axis(d3.timeParse("%Y")(d.key)) })
            .y(function(d) { return y_axis(d.count) })
            )

        // Plot the point locations
        svg2.append("g")
        .selectAll("dot")
        .data(decriminal_years)
        .enter()
        .append("circle")
            .attr("cx", function(d) {  return x_axis(d3.timeParse("%Y")(d.key))  } )
            .attr("cy", function(d) { return y_axis(d.count) } )
            .attr("r", 5)
            .attr("fill", "green")
            .on("mouseover", function(event,d) {
            let year = parseInt(d['key'])
            tip.transition()
                .duration(200)
                .style("opacity", opac_1);
            tip.html("Year: " + year+"-"+(year+10) + "<br/>" +"Countries: "+d["orig_count"])
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function(d) {
            tip.transition()
                .duration(500)
                .style("opacity", opac_0);
        })

        // Wrangle data for the dropdwon
        var optionMap = new Map(Object.entries(options))

        // Set the listener for the drop down
        d3.select("#selectButton").on("change", function(d, i) {
            var selectedOption = d3.select(this).property("value")
            newData = []
            legal_data.forEach(d => {
                newData[d['COUNTRY']] =  d[selectedOption]
            })
            drawMap(g_path, newData)
            selected = d3.select('#selectButton option:checked').text()
        });

        // Set up the dropdown
        d3.select("#selectButton")
        .selectAll('myOptions')
        .data(optionMap)
        .enter()
        .append('option')
        .text(function (d) { return d[0]; })
        .attr("value", function (d) { return d[1]; }) 
        .property("selected", function(d){ return d[1] =="BROAD PROT." ; })

        // Draw the initial choropleth
        let newData = []
        legal_data.forEach(d => {newData[d['COUNTRY']] =  d["BROAD PROT."]})
        drawMap(g_path,newData)

        // Draw the legend for choropleth
        svg1.append("rect").attr("width", "20px").attr("height", "20px").attr("x",350).attr("y",10).style("fill", "#00ff00").style("stroke", "#000000")
        svg1.append("rect").attr("width", "20px").attr("height", "20px").attr("x",425).attr("y",10).style("fill", "#FF0000").style("stroke", "#000000")
        svg1.append("rect").attr("width", "20px").attr("height", "20px").attr("x",500).attr("y",10).style("fill", "#0000FF").style("stroke", "#000000")
        svg1.append("text").attr("x", 375).attr("y", 20).text("YES").style("font-size", "15px").attr("alignment-baseline","middle")
        svg1.append("text").attr("x", 450).attr("y", 20).text("NO").style("font-size", "15px").attr("alignment-baseline","middle")
        svg1.append("text").attr("x", 525).attr("y", 20).text("LIMITED").style("font-size", "15px").attr("alignment-baseline","middle")

})})

// Draw the chorpleth map based upon the selected value in the dropdwon
function drawMap(geoPath, data) {
    d3.select( "#viz2" ).selectAll(".country").remove()

    svg1.append("g")
        .selectAll("path")
        .data(topojson.feature(count_data, count_data.objects.countries).features)
        .enter()
        .append("path")
        .style("stroke", "#000000")
        .on("mouseover", function(event,d) {
            tip.transition()
                .duration(200)
                .style("opacity", opac_1);
            tip.html("Country: "+d.properties.admin + "<br/>" +selected+": "+data[d.properties.admin])
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function(d) {
            tip.transition()
                .duration(500)
                .style("opacity", opac_0);
        })
        .attr( "d", geoPath )
        .style("fill",(d)=>{
            let status = data[d.properties.admin]
            if(status == "YES") {
                return "#00ff00"
            } else if(status == "LIMITED") {
                return "#0000FF"
            } else {
                return "#ff0000"
            }
        })
        .style("opacity", (d)=>{ 
            if(d.properties.admin=="Antarctica"){
                return opac_0
            } else{
                return opac_1
            }});          
}