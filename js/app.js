//queue 
(function(){function n(n){function t(){for(;f=a<c.length&&n>p;){var u=a++,t=c[u],r=l.call(t,1);r.push(e(u)),++p,t[0].apply(null,r)}}function e(n){return function(u,l){--p,null==d&&(null!=u?(d=u,a=s=0/0,r()):(c[n]=l,--s?f||t():r()))}}function r(){null!=d?v(d):i?v(d,c):v.apply(null,[d].concat(c))}var o,f,i,c=[],a=0,p=0,s=0,d=null,v=u;return n||(n=1/0),o={defer:function(){return d||(c.push(arguments),++s,t()),o},await:function(n){return v=n,i=!1,s||r(),o},awaitAll:function(n){return v=n,i=!0,s||r(),o}}}function u(){}"undefined"==typeof module?self.queue=n:module.exports=n,n.version="1.0.4";var l=[].slice})();

//store all the routes
var connect;

//loading it
var loading = document.getElementById("loading");

//selection
var selection = document.getElementById("selection");

var previous = 'the World';

// The SVG container
var width  = "100%",
    height = "100%";

var color = d3.scale.category10();

var projection = d3.geo.mercator()
                .translate([400, 270])
                .scale(800);

var path = d3.geo.path().projection(projection);

var arc = d3.geo.greatArc().precision(3);

var svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.behavior.zoom().scaleExtent([1,10]).on("zoom", redraw))
    .append("g");

d3.select("#map").on("click",  function() {
    console.log("success");
  if(this.outerText == ""){
    previous = 'the World';
  }
});

function redraw() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

var tooltip = d3.select("#map").append("div")
    .attr("class", "tooltip");

queue()
    .defer(d3.json, "data/world-110m.json")
    .defer(d3.tsv, "data/country-names.tsv")
    .await(ready);

function ready(error, world, names) {

  var countries = topojson.object(world, world.objects.countries).geometries,
      neighbors = topojson.neighbors(world, countries),
      i = -1,
      n = countries.length;

  countries.forEach(function(d) { 
    var tryit = names.filter(function(n) { return d.id == n.id; })[0];
    if (typeof tryit === "undefined"){
      d.name = "Undefined";
      console.log(d);
    } else {
      d.name = tryit.name; 
    }
  });

  var country = svg.selectAll(".country").data(countries);

  country
   .enter()
    .insert("path")
    .attr("class", "country")    
      .attr("title", function(d,i) { return d.name; })
      .attr("d", path)
      .style("fill", function(d, i) { return color(d.color = d3.max(neighbors[i], function(n) { return countries[n].color; }) + 1 | 0); });

    //Show/hide tooltip
    country.on("mousemove", function(d,i) {
      var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

      tooltip.classed("hidden", false)
        .attr("style", "left:"+(mouse[0]+25)+"px;top:"+mouse[1]+"px")
        .html(d.name)
    })
    .on("mouseout",  function(d,i) {
      tooltip.classed("hidden", true)
    })
    .on("click",  function(d,i) {
      selcountry(d);
    });

  var arcs = svg.append("g").attr("id", "arcs");

  //load openflights data and split it into country to country, world to country, airport to world
  d3.csv("data/openflights.csv", function(error, flights) {

    connect = function(source, destination){
      return flights.filter(function(d) { 
        if (d.sourceCountry == source && d.destinationCountry == destination){
          return d;
        }
      });
    }

    getairport = function(source){
      return flights.filter(function(d) { 
        if (d.source == source){
          return d;
        }
      });
    }

    world = function(source){
      return flights.filter(function(d) { 
        if (d.sourceCountry == source && d.destinationCountry != source){
          return d;
        }
      });
    }

    loading.style.display = 'none';

  });


  function selairport(a) {
    loading.style.display = 'block';
    window.setTimeout(function() {
      clear();
      var objs = getairport(a);
      selection.innerHTML = 'Direct flights from '+a+' to the World';
      process(objs);
      previous = 'the World';
    }, 100);
  }

  function selcountry(c) {
    loading.style.display = 'block';

    window.setTimeout(function() {
      var current = c.name;
      clear();

      //if previous click was world, show world destinations, otherwise show country
      if(previous == 'the World'){
        var objs = world(current);
        process(objs);
      } else {
        //show country to country or internal
        var objs = connect(previous, current);
        process(objs);
      }

      selection.innerHTML = 'Direct flights from '+ current +' to '+previous;

      //update previous to current
      previous = current;
    }, 100);
  }

  function process(objs){

        //setup the table
        var columns = ["Airline", "Source", "Destination"];

        var table = d3.select("#tcontainer").append("table"),
            thead = table.append("thead"),
            tbody = table.append("tbody");

        // append the header row
        thead.append("tr")
            .selectAll("th")
            .data(columns)
            .enter()
            .append("th")
            .text(function(column) { return column; });


        var links = [];
        objs.forEach(function(d) { 

          //update the TD in tables
          tbody.append("tr").html('<td>'+d.airlineName+'</td><td>'+d.sourceAirportName+' ('+d.source+')</td><td>'+d.destinationAirportName+' ('+d.destination+')</td>');

          var lat1 = Number(d.sourceLatitude);
          var lat2 = Number(d.destinationLatitude);
          var lon1 = Number(d.sourceLongitude);
          var lon2 = Number(d.destinationLongitude);

          links.push({'source': [lon1, lat1],'target': [lon2, lat2]});

          var x1 = projection([lon1,lat1])[0];
          var y1 = projection([lon1,lat1])[1];

          var x2 = projection([lon2,lat2])[0];
          var y2 = projection([lon2,lat2])[1];   

          appendPoint(x1,y1,d.source,0.8,"airport");
          appendPoint(x2,y2,d.destination,0.8,"airport");
                                         
        });


        //make table sortable: http://www.kryogenix.org/code/browser/sorttable/#ajaxtables
        var newTable = document.getElementsByTagName("table")[0];
        sorttable.makeSortable(newTable);

        arcs.selectAll("path")
            .data(links)
            .enter().append("path")
            .style("stroke-width", 0.1)
            .style("stroke", "grey")
            .style("fill", "none")
            .attr("d", function(d) { return path(arc(d)); });


        //add tooltips to airports
        var airport = svg.selectAll(".airport");

        //Show/hide tooltip
        airport.on("mousemove", function(d,i) {

        var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

        tooltip.classed("hidden", false)
               .attr("style", "left:"+(mouse[0]+25)+"px;top:"+mouse[1]+"px")
               .html(this.attributes.title.value)
        })
        .on("mouseout",  function(d,i) {
          tooltip.classed("hidden", true)
        })
        .on("click",  function() {
          selairport(this.attributes.title.value);
        });

        loading.style.display = 'none';

  }


  function clear(){

    loading.style.display = 'block';

    //clear arcs before redrawing!
    svg.selectAll("#arcs path").remove();

    //remove airports too
    svg.selectAll(".airport").remove();

    //remove table if it exists
    var oldtable = document.getElementsByTagName("table");

    if(oldtable.length>0){
      oldtable[0].remove();
    }
  }


  function appendPoint(x,y,name,radius,theclass) {

    svg.append("svg:circle")
       .attr("class",theclass)
       .attr("cx", x)
       .attr("cy", y)
       .attr("r", radius)
       .attr("title", name);

  }

}