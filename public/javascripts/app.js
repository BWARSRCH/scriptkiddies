
define([
       'jquery',
       'angular',
       'leaflet',
       'd3',
       'underscore',
       'leaflet-markercluster',
       'leaflet-label',
       'locationfilter',
       'socketio',
       'streamable',
       'angular-leaflet-directive'
      ], function($,angular) {

  var app = angular.module('scriptkiddies', []);

  $(function() {

  angular.bootstrap(document, ['scriptkiddies']);

  var teetercon = L.icon({
      iconUrl: '/images/ht.png',
      iconSize:     [32,32], // size of the icon
      iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
      popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
  });

  var cloudmadeUrl = 'http://a.tile.cloudmade.com/b90910898d15474ca52846a11bd303e8/{styleId}/256/{z}/{x}/{y}.png',
      cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade';

  var minimal   = L.tileLayer(cloudmadeUrl, {styleId: 22677, attribution: cloudmadeAttribution}),
      googleclone  = L.tileLayer(cloudmadeUrl, {styleId: 92017,   attribution: cloudmadeAttribution});

  var map = new L.Map("map", {
          center: [35.227087, -80.843127],
          zoom: 10,
          layers: [minimal,googleclone]
    });

  // var locationFilter = new L.LocationFilter().addTo(map);

  // locationFilter.on('change', function(e) {
  //   var ne = e.bounds.getNorthEast();
  //   var sw = e.bounds.getSouthWest();
  //   var reqData = {params: {neLat: ne.lat, neLng: ne.lng, swLat: sw.lat, swLng: sw.lng}};
  //   Streamable.get('/households/search/bounds', reqData, {
  //     onData:  function(data) { console.log(data); },
  //     onError: function(e) { console.log(e); },
  //     onEnd:   function() { console.log('all done'); }
  //   });
  // });

  var base =  {
      "Minimal": minimal,
      "Google Clone": googleclone
  };


  var teeterList = [];
  var stores= [];
  $.getJSON('/stores', function(data) {
    stores = data;
    $.each(data, function(key, val) {
      var desc = "Harris Teeter #" + val.storeId;
      var teeter = L.marker([val.loc[1],val.loc[0]],{icon: teetercon},{title: val.storeId}).bindLabel(desc);
       teeter.on('click', onMarkerClick);
      teeterList.push(teeter);
    });

  });

  var teeters = L.layerGroup(teeterList);
  var results = [];
  var tracts;

function style(feature) {
    return {
        fillColor: getColor(feature.properties.density),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
};

  var myLayer = L.geoJson(null,{
        style: function(feature) {
          return {
              fillColor: getColor(feature.properties.pop),
              weight: 2,
              opacity: 1,
              color: 'white',
              dashArray: '3',
              fillOpacity: 0.4
          };
        },
        onEachFeature: function(feature, layer) {
          layer.on({
              mouseover: highlightFeature,
              mouseout: resetHighlight,
              click: zoomToFeature
          });
          /*layer.on('click', function(e) {
            // e contains properties:
            // latlng, corresponds to L.LatLng coordinate clicked on map
            // containerPoint, L.Point
            // layerPoint, L.Point
            layer.setStyle({fillOpacity: 0.8});
          });*/
        }
      }).addTo(map);

  $('#clear-search').on('click', function(e) {
    myLayer.eachLayer(function(layer) {
      layer.setStyle({fillOpacity: 0.4});
    });
  });


function calcArea(coordinates){
  return  _.map(coordinates, function(entry) {
    return _.reduce(entry, function(list, polygon) {
        _.each(_.map(polygon, function(point) {
            return new google.maps.LatLng(point[1], point[0]);
        }), function(point) {
            list.push(point);
    });
        var area = google.maps.geometry.spherical.computeArea(list) / 2589988;
        return area;
    }, []);
})
};

var geojson;
var info = L.control();
info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = '<h4>NC Census Tract Data</h4>' +  (props ?
        '<b>' +'Population Density 2010' + '</b>' + props.density + ' people / mi<sup>2</sup></br>' +
        '<b>' +'Population Density 2010' + '</b>' + props.density + ' people / mi<sup>2</sup>'
        : 'Hover over an area');
};
info.addTo(map);

var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        grades = [0, 500, 1000, 1500,2500, 3000, 4000, 5000],
        labels = [];
    // loop through our density intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }

    return div;
};
legend.addTo(map);


  var totalTractIds = 0;
  Streamable.get('/tracts',  {
    onData:  function(data) {
      parsed = JSON.parse(data);
      try {
        var area = calcArea([parsed.loc.coordinates]);
        var totalPop2000 = _.where(parsed.totalPopulations, {year: 2000})[0].count;
        var totalPop2010 = _.where(parsed.totalPopulations, {year: 2010})[0].count;
        var populationDensity2000 = totalPop2000 / area;
        var populationDensity2010 = totalPop2010 / area;
      }
      catch(exception) {
        console.log(exception);
      }

      //results.push(parsed.tractId);
      //results.push(totalPop2010);
      var tract = [{
        "type": "Feature",
        "properties": {
          tractId: parsed.tractId,
          'Population 2010': totalPop2010,
          'pop': totalPop2000,
          'Area'           : area,
          'Pop Density 2000': populationDensity2000,
          'density': populationDensity2010
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": parsed.loc.coordinates
        }
      }];
      //geojson = L.geoJson(tract, {style: style, onEachFeature: onEachFeature}).addTo(map);
      myLayer.addData(tract);
    },
    onError: function(e) { console.log(e); },
    onEnd: function() {
      console.log('all done');
      /*var options = {params: {tractIds: results.join(',')}};
      Streamable.get('/households/search/tracts', options, {
        onData: function(data) {
          console.log(JSON.parse(data));
        },
        onError: function(err) {
          console.log(err);
        }
      });*/
      //console.log(_.max(results));
      //console.log(_.sortBy(results, function(num) { return num; }));
    }
  });

function highlightFeature(e) {
    var layer = e.target;
    info.update(layer.feature.properties);
    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });
    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
    myLayer.resetStyle(e.target);
    info.update();
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}
function getColor(d) {
    return d > 5000 ? '#800026' :
           d > 4000  ? '#BD0026' :
           d > 3000  ? '#E31A1C' :
           d > 2500  ? '#FC4E2A' :
           d > 1500   ? '#FD8D3C' :
           d > 1000   ? '#FEB24C' :
           d > 500   ? '#FED976' :
                      '#FFEDA0';
}


  var overlays = {"Harris Teeters": teeters};
  L.control.layers(base,overlays).addTo(map);

  var markers = new L.MarkerClusterGroup();
  function onMarkerClick(e) {
     $.each(stores, function(key, val) {
        console.log(e);
        if( val.loc[1] == e.target._latlng.lat && val.loc[0] == e.target._latlng.lng){
        var markerList = [];
        var storeurl = '/stores/' + val.storeId + '/households';
        $.getJSON(storeurl, function(data) {
           $.each(data, function(key, val) {
             var marker = new L.Marker(new L.LatLng(val.loc[1], val.loc[0]), { title: "asdf" });
             markerList.push(marker);
           });
            markers.clearLayers();
            markers.addLayers(markerList);
            map.addLayer(markers);
         });
      }
    });
  }


  // Themes:
  // - Dark Blue: 67367
  // - Transparent: 998

  });

  return app;
});
