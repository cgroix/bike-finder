var setting = {
        city:       "Nantes",
        key:        "502a8edad6c6e65044cce9e471d1ae452695c1e8",
        baseWS:     "https://api.jcdecaux.com/vls/v1/"
    };

var data = {
    stations    : [],
    position    : null,
    geoloc      : false,
    geolocMarker: null,
    map         : null
};

/*
 * Utility function
 */
String.prototype.capitalize = function () {
    if (this) {
        return this[0].toUpperCase() + this.slice(1);
    } else {
        return this;
    }
};


var xhr = function (url, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.onreadystatechange = callback;
    xhr.open("get", url, true);
    xhr.send();
};

var createStation = function (data) {

    var that;

    //private variables
    var lastUpdated = 0;
    var number = data.number;
    var name = data.name.replace(/^[0-9]* ?\- ?/, "").toLowerCase().capitalize();
    var address = data.address;
    var longitude = data.longitude;
    var latitude = data.latitude;
    var status = null;
    var available_bikes = null;
    var available_bike_stands = null;
    var availability = 'unknown';

    var marker = L.marker(
            [latitude, longitude],
            {title:  name }
        );


    //private function
    var updateIcon = function () {
        var newIcon = L.divIcon(
            {
                className:  'icon ' + availability,
                iconSize:   null,
                html:       "<p class=\"text\">" + (lastUpdated ? (available_bikes + '-' + available_bike_stands) : number) + "</p>"
            }
        );
        marker.setIcon(newIcon);
    };
    var printInfo = function (info) {
        var container = document.getElementById("pData");
        container.textContent = name;
        if (lastUpdated) {
            container.textContent += ": " + available_bikes + " bikes, " + available_bike_stands + " stands.";
        }
    };
    var getInfoCB = function (e) {
        if (this.readyState === 4) {
            if (this.status === 200) {
                var data = JSON.parse(this.responseText);
                if (data) {
                    lastUpdated = Date.now();
                    status = data.status;
                    available_bikes = data.available_bikes;
                    available_bike_stands = data.available_bike_stands;
                    availability = "ok";
                    if (status !== "OPEN") {
                        availability = "ko";
                    } else if (available_bikes === 0) {
                        availability = "empty";
                    } else if (available_bikes < 3) {
                        availability = "almostEmpty";
                    } else if (available_bike_stands === 0) {
                        availability = "full";
                    } else if (available_bike_stands < 3) {
                        availability = "almostFull";
                    }
                } else {
                    console.log("Error in API response: url =" + ", response = " + this.responseText);
                }
            } else {
                console.log("Error in connection to API: url =" + ", XHR state = " +  this.readyState + ", HTTP status = " + this.status);
            }
            console.log(availability);
            updateIcon();
        }
    };

    //working:
    marker.on('click', printInfo);
    var url = "https://api.jcdecaux.com/vls/v1/stations/" + number + "?&apiKey=502a8edad6c6e65044cce9e471d1ae452695c1e8&contract=Nantes";
    updateIcon();

    //public interfae:
    that = {
        name        : name,
        status      : status,
        addTo       : function (map) {marker.addTo(map); },
        removeTo    : function (map) {map.removeLayer(marker); },
        getLatLng   : function () {return marker.getLatLng(); },
        updateInfo  : function () {if (lastUpdated === 0) {xhr(url, getInfoCB); } }
    };

    return that;

};



var addMyIcon = function (icone, fonction) {
    var div = document.createElement('div');
    div.classList.add('controlIcon');
    div.setAttribute("onClick", fonction);
    var font = document.createElement('i');
    font.classList.add(icone);
    div.appendChild(font);
    return div;
};

var geoloc = function () {
    var position = function (position) {
        data.geolocMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
        data.geolocMarker.addTo(data.map);
        data.geolocMarker.update();
        data.map.setView([position.coords.latitude, position.coords.longitude], 16);
    };

    if (data.geoloc) {
        data.geolocMarker.setLatLng([0, 0]);
        data.geolocMarker.update();
        data.geoloc = false;
        data.geolocMarker.addTo(data.map);
        navigator.geolocation.clearWatch(data.geolocId);
    } else {
        data.geoloc = true;
        window.navigator.geolocation.getCurrentPosition(position);
        data.geolocId = window.navigator.geolocation.watchPosition(position);
    }
};

function placeMarkersInBounds() {
    console.log('place')
    var i;
    var mapBounds = data.map.getBounds();
    for (i = 0; i < data.stations.length; i++) {
        var m = data.stations[i];
        if (mapBounds.contains(m.getLatLng())) {
            m.updateInfo();
            m.addTo(data.map);
        } else {
            m.removeTo(data.map);
        }
    }
}

var onLoad = function () {

    //setting map background
    var tilesUrl = 'tiles/nantes/{z}/{x}/{y}.png';
    var tilesLayer = new L.TileLayer(tilesUrl, {minZoom: 12, maxZoom: 16, attribution: "Data \u00a9 OSM ctrbs, ODL"});

    data.map = new L.Map('map');
    data.map.addLayer(tilesLayer);
    data.map.setView(new L.LatLng(47.2, -1.55), 15);

    //setting position marker
    data.geolocMarker = L.marker(
        [0, 0],
        {title:  geoloc }
    );
    var geolocIcon = L.divIcon(
        {
            className:  'geoloc',
            iconSize:   [15, 15]
        }
    );
    data.geolocMarker.setIcon(geolocIcon);


    //setting stations marker and data
    var i;
    for (i in data.Nantes) {
        var station = createStation(data.Nantes[i]);
        station.addTo(data.map);
        data.stations.push(station);
    }

    //setting controls
    var control = L.control({position: 'topright'});

    control.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'buttons');
        div.appendChild(addMyIcon('icon-cog', ""));
        div.appendChild(addMyIcon('icon-repeat', "window.location.reload()"));
        if (navigator.geolocation !== 'undefined') {
            div.appendChild(addMyIcon('icon-map-marker', 'geoloc()'));
        }
        return div;
    };

    var info = L.control({position: 'bottomleft'});

    info.onAdd = function (map) {
        var div = document.createElement('div');
        div.id  = 'data';
        var pdata   = document.createElement('p');
        pdata.id = 'pData';

        div.appendChild(pdata);
        return div;
    };

    info.addTo(data.map);
    control.addTo(data.map);
    data.map.on('moveend', placeMarkersInBounds);
    placeMarkersInBounds();
};