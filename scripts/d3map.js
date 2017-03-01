/// <reference path="../js/jquery-1.9.1-vsdoc.js" />
/// <reference path="../js/d3.v3.js" />
/// <reference path="../js/topojson.js" />
/// <reference path="../js/jquery-ui.js" />

var d3svg = d3svg || {};

d3svg.map = new function () {

    var _this = this;
    var $ = jQuery;

    var path;
    var svg;
    var zoom;

    //var WebHost = "http://d3svg.net76.net/";
    var WebHost = "";
    var geodatajs = WebHost + "data/us.js";
    var shalebasinsjs = WebHost + "data/US_ShaleBasins_topo.js";
    var shaleplaysjs = WebHost + "data/US_ShalePlays_topo.js";
    var shalewellsjs = WebHost + "data/wells.js";

    var width = 960, height = 500;

    function GetClientViewSize() {
        var w = window, d = document.documentElement, b = document.getElementsByTagName("body")[0];
        width = w.innerWidth || d.clientWidth || b.clientWidth;
        height = w.innerHeight || d.clientHeight || b.clientHeight;
    }

    new function () {
        init();
        $(window).unload(dispose);
    }

    function dispose() {
        _this = null;
    }

    function init() {

        $(function () {
            _this.shalemap = $('.d3svg-d3shalemap');
            _this.shalemap.append("<h1 style='margin:auto; width:500px' class='mapTitle'>US Shale Gas & Oil Map</h1>");

            addControls();
            initView();
            addLayers();

            $.getScript(geodatajs, function () {
                
                hideMessage();

                //showUSLandBorder();
                //showUSStateBorder();
                //showUSCountyBorder();
                showUSStates();
                showUSCounties();

                $.getScript(shalebasinsjs, function () {
                    showShaleBasins();
                });

                $.getScript(shaleplaysjs, function () {
                    showShalePlays();
                });

                $.getScript(shalewellsjs, function () {
                    showShaleWells();
                });

                addZoomSlider();

                addZoomButtons();

                addCompass();
            });
        });
    }

    function initView() {

        GetClientViewSize();

        var v_width = width * 0.9;
        var v_height = height * 0.9;

        svg = d3.select('.d3svg-d3shalemap')
            .append('svg')
            .attr('width', v_width)
            .attr('height', v_height);

        zoom = d3.behavior.zoom();
        svg.call(
            zoom
            .scaleExtent([1, 100])
            .on("zoom", zoomed));

        // loading message
        showMessage("Loading Data ...", v_width, v_height)

        // create projection based on the view width and height
        var projection = getProjectionBySize(v_width, v_height);

        // create path generator
        path = d3.geo.path().projection(projection);
        path.pointRadius(1.6);
    }

    var usMap;
    function addLayers() {
        usMap = svg.append('g').classed('usmap', true);
        usLand = usMap.append('g').classed('d3svgUSLand', true);
        usStates = usMap.append('g').classed('d3svgUSStates', true);
        usCounties = usMap.append('g').classed('d3svgUSCounties', true);
        shaleBasins = usMap.append('g').classed('d3svgShaleBasins', true);
        shalePlays = usMap.append('g').classed('d3svgShalePlays', true);
        shaleWells = usMap.append('g').classed('d3svgShaleWells', true);
    }

    var currTranslate = [0,0], currScale = 1;

    function zoomed() {
        currTranslate = d3.event.translate;
        currScale = d3.event.scale;

        if (usMap) {
            usMap.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            usMap.style("stroke-width", 1 / d3.event.scale + "px");
        }

        $('.d3svgMapSilder').slider("value", currScale);
    }

    function sliderZoom(value) {
        if (usMap) {

            currTranslate = [-600 * (value - 1), -300 * (value - 1)];
            currScale = value;

            zoom.scale(currScale);
            zoom.translate(currTranslate);
            usMap.attr("transform", "translate(" + currTranslate + ")scale(" + value + ")");
            usMap.style("stroke-width", 1 / value + "px");            
        }
    }

    function showMessage(msg, v_width, v_height)
    {
        svg.append("text")
            .attr("class", "loadingMsg")
            .attr("transform", "translate(" + v_width / 2 + ", " + v_height / 2 + ")")
            .style("font-family", "arial")
            .style("font-size", "24px")
            .text(msg);
    }

    function hideMessage()
    {
        d3.select(".loadingMsg").remove();
    }

    /**
     * Returns a d3 Albers conical projection (en.wikipedia.org/wiki/Albers_projection) that maps the bounding box
     * defined by the lower left geographic coordinates (lng0, lat0) and upper right coordinates (lng1, lat1) onto
     * the view port having (0, 0) as the upper left point and (width, height) as the lower right point.
     */
    function getProjectionBySize(width, height) {
        // The default scale is 1070. Must scale it back to 1 in order to re-scale the map according to the view port size
        var projection = d3.geo.albersUsa().scale(1);
        // Just pick to random locations will be fine since everything will be proportional
        var Miami = [-80.200195, 25.78629];
        var Seattle = [-122.336197, 47.610792];
        // Project the two longitude/latitude points into pixel space. These will be tiny because scale is 1.
        var p0 = projection(Seattle);
        var p1 = projection(Miami);
        // The actual scale is the ratio between the size of the bounding box in pixels and the size of the view port.
        // Reduce by 30% since the locations are random
        var s = 1 / Math.max((p1[0] - p0[0]) / width, (p1[1] - p0[1]) / height) * 0.7;
        // Move the center to (0, 0) in pixel space.
        var t = [width / 2, height / 2];
        // Scale and Translate
        return projection.scale(s).translate(t);
    }

    function showUSLandBorder() {
        svg.select('g.d3svgUSLand').append("path")
            .datum(topojson.feature(usTopojson, usTopojson.objects.land))
            .attr("class", "land")
            .attr("d", path)
            .style('fill', 'none')
            .style('stroke', 'blue')
            .style('stroke-width', 1);
    }

    function showUSLandBorder2() {
        svg.select('g.d3svgUSLand')
            .append('path')
            .datum(topojson.mesh(usTopojson, usTopojson.objects.states, function (a, b) {
                return a === b
        }))
        .attr('d', path)
        .style('fill', 'none')
        .style('stroke', 'green')
        .style('stroke-width', 0.5);
    }

    function showUSStateBorder() {
        svg.select('g.d3svgUSStates').append("path")
            .datum(topojson.mesh(usTopojson, usTopojson.objects.states, function (a, b) { return a !== b; }))
            .attr("class", "state-boundary")
            .attr("d", path)
            .style('fill', 'none')
            .style('stroke', 'green')
            .style('stroke-width', 1);
    }

    function showUSStates() {
        svg.select('g.d3svgUSStates')
            .selectAll('path')
            .data(topojson.feature(usTopojson, usTopojson.objects.states).features)
            .enter()
            .append('path')
            .attr("d", path)
            .style('fill', 'none')
            .style('stroke', 'green')
            .style('stroke-width', 0.5);
    }

    function showUSCountyBorder() {
        svg.select('g.d3svgUSCounties')
            .append("path")
           .datum(topojson.mesh(usTopojson, usTopojson.objects.counties, function (a, b) {
               return a !== b && !(a.id / 1000 ^ b.id / 1000);
           }))
            .attr("class", "county-boundary")
            .attr("d", path)
            .style('fill', 'none')
            .style('stroke', 'gray')
            .style('stroke-width', 0.5);
    }

    function showUSCounties() {
        var usMapPath = svg.select('g.d3svgUSCounties').append('g').classed('d3svgUSCounties',true)
            .selectAll('path')
            .data(topojson.feature(usTopojson, usTopojson.objects.counties).features)
            .enter()
            .append('path')
            .attr('d', path)
            .style('fill', '#fff')
            .style('stroke', '#fff')
            .style('stroke-width', 0.5);
            //.style('fill-opacity', 0)
            //.style('stroke-opacity', 0);

        usMapPath.transition()
            .duration(3000)
            .style('fill', 'lightblue');
            //.style('stroke', 'blue')
    }

    function showShaleBasins() {
        var shaleMap = usMap.select('g.d3svgShaleBasins')
            .selectAll('path')
            .data(topojson.feature(shaleBasins, shaleBasins.objects.shalebasins).features)
            .enter()
            .append('path')
            .attr('d', path)
            .style('fill', '#fff')
            .style('fill-opacity', 0)
            .style('stroke', '#fff')
            .style('stroke-opacity', 0)
            .style('stroke-width', 0.5);

        shaleMap.transition()
            .duration(3000).style('fill', 'pink').style('stroke', 'red').style('fill-opacity', 0.5).style('stroke-opacity', 1);
    }

    function showShalePlays() {
        var shaleMap = usMap.select('g.d3svgShalePlays')
            .selectAll('path')
            .data(topojson.feature(shalePlays, shalePlays.objects.shaleplays).features)
            .enter()
            .append('path')
            .attr('d', path)
            .style('fill', '#fff')
            .style('fill-opacity', 0)
            .style('stroke', '#fff')
            .style('stroke-opacity', 0)
            .style('stroke-width', 0.5);

        shaleMap.transition()
            .duration(3000).style('fill', 'blue').style('stroke', 'blue').style('fill-opacity', 0.5).style('stroke-opacity', 1);
    }

    function showShaleWells() {
        var wellMap = usMap.select('g.d3svgShaleWells')
            .selectAll('path')
            .data(d3svgShaleWells.features)
            .enter()
            .append('path')
            .attr('d', path)
            .style('fill', 'red')
            .style('fill-opacity', 1);

        //shaleMap.transition()
        //    .duration(3000).style('fill', 'blue').style('stroke', 'blue').style('fill-opacity', 0.5).style('stroke-opacity', 1);
    }

    function fadeinPaths(groupName, fillOpacity, strokeOpacity) {
        svg.select('.' + groupName)
            .selectAll('path')
            .transition()
            .duration(1000)
            .style('fill-opacity', fillOpacity)
            .style('stroke-opacity', strokeOpacity);
    }

    function fadeoutPaths(groupName) {
        svg.select('.' + groupName)
            .selectAll('path')
            .transition()
            .duration(1000)
            .style('fill-opacity', 0)
            .style('stroke-opacity', 0);
    }

    function loadasync(url) {
        var head = document.getElementsByTagName("head")[0]; // Find document <head>
        var s = document.createElement("script"); // Create a <script> element
        s.src = url; // Set its src attribute
        head.appendChild(s); // Insert the <script> into head
    }

    function forceIEedge() {
        var head = document.getElementsByTagName("head")[0]; // Find document <head>
        var meta = document.createElement("meta"); // Create a <script> element
        meta.setAttribute('http-equiv', 'X-UA-Compatible');
        meta.setAttribute('content', 'IE=edge');
        head.insertBefore(meta, head.firstChild);
    }

    function addControls() {
        addCountiesCheckbox();
        addShaleBasinsCheckbox();
        addShalePlaysCheckbox();
    }

    function addCountiesCheckbox() {
        var checkbox = $("<input id='d3svgCheckbox' class='d3svgControl d3svgCheckbox' type='checkbox' checked/>");
        _this.shalemap.append(checkbox);
        _this.shalemap.append("<label class='d3svgControl d3svglabel' for='d3svgCheckbox'>Show Counties</label>")

        checkbox.change(function () {
            var checked = $(this).prop("checked");

            if (checked && $(".d3svgUSCounties").length == 0) {
                showUSCounties();
                return;
            }
            if (checked) {
                fadeinPaths("d3svgUSCounties", 1, 1);
            }

            if (!checked) {
                fadeoutPaths("d3svgUSCounties");
            }

        });
    }

    function addShaleBasinsCheckbox()
    {
        var checkbox = $("<input id='d3svgCheckbox' class='d3svgControl d3svgCheckbox' type='checkbox' checked='checked' />");
        _this.shalemap.append(checkbox);
        _this.shalemap.append("<label class='d3svgControl d3svglabel' for='d3svgCheckbox'>US Shale Basins</label>")

        checkbox.change(function () {
            var checked = $(this).prop("checked");
            if (checked) {
                fadeinPaths("d3svgShaleBasins", 0.5, 1);
            }
            
            if (!checked) {
                fadeoutPaths("d3svgShaleBasins");
            }

        });
    }

    function addShalePlaysCheckbox() {
        var checkbox = $("<input id='d3svgCheckbox' class='d3svgControl d3svgCheckbox' type='checkbox' checked='checked' />");
        _this.shalemap.append(checkbox);
        _this.shalemap.append("<label class='d3svgControl d3svglabel' for='d3svgCheckbox'>US Shale Plays</label>")

        checkbox.change(function () {
            var checked = $(this).prop("checked");
            if (checked) {
                fadeinPaths("d3svgShalePlays", 0.5, 1);
            }

            if (!checked) {
                fadeoutPaths("d3svgShalePlays");
            }
        });
    }

    function addZoomSlider() {
        _this.shalemap.append("<div class='d3svgMapSilder'></div>");

        $('.d3svgMapSilder').slider({
            orientation: "vertical",
            min: 1,
            max: 10,
            step: 0.1,
            slide: function (event, ui) {
                sliderZoom(ui.value);
            }
        });
    }

    function addZoomButtons() {

        $("<img src='img/plus.png' class='d3svgplus'/>")
            .appendTo(_this.shalemap)
            .click(function () {
                var s = $('.d3svgMapSilder');
                var zv = s.slider("value") + 0.1;
                if (zv <= 10) {
                    s.slider("value", zv);
                    sliderZoom(zv)
                }
            });

        $("<img src='img/minus.png' class='d3svgminus' />")
            .appendTo(_this.shalemap)
            .click(function () {
                var s = $('.d3svgMapSilder');
                var zv = s.slider("value") - 0.1;
                if (zv >= 1) {
                    s.slider("value", zv);
                    sliderZoom(zv)
                }
            });
    }

    function addCompass() {
        $("<img class='d3svgCompass' alt='' src='img/compass.png' usemap='#compass'/>")
        .appendTo(_this.shalemap);
        var compass = $("<map name='compass'>").appendTo(_this.shalemap);
        $("<area shape='poly' coords='0,0,37,38,72,0'>").click(function () {compassClicked(1)}).appendTo(compass);
        $("<area shape='poly' coords='0,0,37,38,0,71'>").click(function () {compassClicked(2)}).appendTo(compass);
        $("<area shape='poly' coords='37,38,0,71,73,71'>").click(function () { compassClicked(3) }).appendTo(compass);
        $("<area shape='poly' coords='72,0,37,38,73,71'>").click(function () { compassClicked(4) }).appendTo(compass);
    }

    function compassClicked(dir) {
        if (usMap) {
            if (dir == 1)
                currTranslate = [currTranslate[0], currTranslate[1] + 10];
            if (dir == 2)
                currTranslate = [currTranslate[0] + 10, currTranslate[1]];
            if (dir == 3)
                currTranslate = [currTranslate[0], currTranslate[1] - 10];
            if (dir == 4)
                currTranslate = [currTranslate[0] - 10, currTranslate[1]];
            usMap.attr("transform", "translate(" + currTranslate + ")scale(" + currScale + ")");
        }
    }
}