var settings;

try {
    localStorage;
    settings = localStorage.settings ? JSON.parse(localStorage.settings) : {};
    //default values:
    settings.ls             = true;
    settings.canvas         = false;
    settings.maxMarker      = 200;
    settings.city           = settings.city || "Nantes";
    settings.startPosition  = settings.startPosition ||  [47.2, -1.55];
    settings.key            = settings.key ||  "502a8edad6c6e65044cce9e471d1ae452695c1e8";
    settings.baseWS         = settings.baseWS ||  "https://api.jcdecaux.com/vls/v1/";

    localStorage.settings   = JSON.stringify(settings);
} catch (charizard) {
    console.log('Error in localStorage: ' + charizard);
    ls = false;
    settings = {
        ls              : false,
        canvas          : false,
        city            : "Paris",
        startPosition   : [48.85, 2.35],
        key             : "502a8edad6c6e65044cce9e471d1ae452695c1e8",
        baseWS          : "https://api.jcdecaux.com/vls/v1/"
    };
}

settings.setCity = function (city) {
    if (settings.city !== city) {
        settings.city = city;
        settings.startPosition = data.centers[city];
        if (settings.ls) {
            localStorage.settings   = JSON.stringify(settings);
        }
        window.location.reload();
    }
};

//Global
var group;

var data = {
    markerCount : 0,
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

var Station = function (data) {

    this.lastUpdated = data.last_update || 0;
    this.number = data.number;
    this.name = data.name.replace(/^[0-9]* ?\- ?/, "").toLowerCase().capitalize();
    this.address = data.address;
    if (data.position) {
        this.longitude = data.position.lng;
        this.latitude = data.position.lat;
    } else  {
        this.longitude = data.longitude;
        this.latitude = data.latitude;
    }
    this.status = data.status || null;
    this.available_bikes = data.available_bikes || null;
    this.available_bike_stands = data.available_bike_stands || null;

    this.availability = "ok";
    if (this.status !== "OPEN") {
        this.availability = "ko";
    } else if (this.available_bikes === 0) {
        this.availability = "empty";
    } else if (this.available_bikes < 3) {
        this.availability = "almostEmpty";
    } else if (this.available_bike_stands === 0) {
        this.availability = "full";
    } else if (this.available_bike_stands < 3) {
        this.availability = "almostFull";
    }

    this.container = null;
    this.marker;

    this.updateIcon();
    var that = this;
    this.marker.on('click', function () {
        var container = document.getElementById("pData");
        container.textContent = that.name;
        if (that.lastUpdated) {
            container.textContent += ": " + (that.available_bikes || '0') + " bikes, " + (that.available_bike_stands || '0') + " stands.";
        }
    });
};

Station.prototype.color = {
    ok          : 'green',
    ko          : 'black',
    empty       : 'yellow',
    almostEmpty : 'orange',
    full        : 'red',
    almostFull  : '#cb6d51'
};

Station.prototype.getColor = function () {
    return this.color[this.availability];
}

Station.prototype.getLatLng = function () {
    return new L.LatLng(this.latitude,this.longitude);
};

Station.prototype.isDisplayed = function () {
    return (this.container != null);
};

Station.prototype.addTo = function (container) {
    this.container = container;
    this.marker.addTo(this.container);
};

Station.prototype.remove = function () {
    if (this.container) {
        this.container.removeLayer(this.marker);
        this.container = null;
    }
};

Station.prototype.updateIcon = function () {
    if (settings.canvas) {
        this.marker = new L.CircleMarker([latitude, longitude], {color:this.getColor()});
        if (this.container) {
            this.marker.addTo(this.container);
        }
    } else {
        var markerIcon = L.divIcon(
            {
                className:  'icon ' + this.availability,
                iconSize:   null,
                html:       "<p class=\"text\">" + (this.lastUpdated ? ( (this.available_bikes || '0') + '-' + (this.available_bike_stands || '0') ) : this.number) + "</p>"
            }
        );
        this.marker = new L.marker([this.latitude, this.longitude],{icon: markerIcon, opacity: 0.8});
    }
};

Station.prototype.printInfo = function () {
    var container = document.getElementById("pData");
    container.textContent = this.name;
    if (this.lastUpdated) {
        container.textContent += ": " + this.available_bikes + " bikes, " + this.available_bike_stands + " stands.";
    }
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

var displaySettings = function() {
    var container = document.getElementById('settings');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function placeMarkersInBounds() {
    var mapBounds = data.map.getBounds();
    for (var i = 0; i < data.stations.length; i++) {
        var m = data.stations[i];
        if (mapBounds.contains(m.getLatLng())) {
            if (!m.isDisplayed() && (settings.maxMarker <= 0 || data.markerCount < settings.maxMarker)) {
                m.addTo(data.map);
                data.markerCount++;
            }
        } else if (m.isDisplayed()) {
            m.remove();
            data.markerCount--;
        }
    }
}

var getAllStationDataCB = function (city) {
    if (this.readyState === 4) {
        if (this.status === 200) {
        var completeData = JSON.parse(this.responseText);
            if (completeData) {
                for (i in completeData) {
                    console.log(completeData[i].name);
                    var station = new Station(completeData[i]);;
                    data.stations.push(station);
                }
            } else {
                console.log("Error in API response: url =" + ", response = " + this.responseText);
            }
        } else {
            for (i in data[settings.city]) {
                var station = new Station(data[settings.city][i]);
                data.stations.push(station);
            }       
        }
    placeMarkersInBounds();
    }
}

var onLoad = function () {

    //setting map background
    var tilesUrl = 'tiles/' +  settings.city + '/{z}/{x}/{y}.png';
    var tilesLayer = new L.TileLayer(tilesUrl, {minZoom: 12, maxZoom: 16, attribution: "Data \u00a9 OSM ctrbs, ODL"});

    data.map = new L.Map('map');
    data.map.addLayer(tilesLayer);
    data.map.setView(settings.startPosition, 15);

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
    var url = settings.baseWS + "stations?&apiKey=" + settings.key + "&contract=" + settings.city;
    xhr(url, getAllStationDataCB);

    //setting controls
    var control = L.control({position: 'topright'});

    control.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'buttons');
        div.appendChild(addMyIcon('icon-cog', "displaySettings()"));
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

    //setting settings selector
    var selector = document.getElementById("selectCity");
    for (var i = 0; i < selector.length;i++) {
        if (selector.options[i].value === settings.city) {
            selector.selectedIndex = i;
            break;
        }
    }
};