var data = data || {}

var bikeSharing = function () {

    var settings;
    var interface = {};


    try {
        localStorage;
        settings = localStorage.settings ? JSON.parse(localStorage.settings) : {};
        //default values:
        settings.ls             = true;
        settings.canvas         = settings.canvas       || false;
        settings.maxMarker      = settings.maxMarker    || 200;
        settings.city           = settings.city         || "Nantes";
        settings.startPosition  = settings.startPosition ||  [47.2, -1.55];
        settings.key            = settings.key          ||  "502a8edad6c6e65044cce9e471d1ae452695c1e8";
        settings.baseWS         = settings.baseWS       ||  "https://api.jcdecaux.com/vls/v1/";

        localStorage.settings   = JSON.stringify(settings);
    } catch (charizard) {
        console.log('Error in localStorage: ' + charizard);
        ls = false;
        settings = {
            ls              : false,
            canvas          : false,
            maxMarker       : 200,
            city            : "Paris",
            startPosition   : [48.85, 2.35],
            key             : "502a8edad6c6e65044cce9e471d1ae452695c1e8",
            baseWS          : "https://api.jcdecaux.com/vls/v1/"
        };
    }

    interface.setCity = function (city) {
        if (settings.city !== city) {
            settings.city = city;
            settings.startPosition = data.centers[city];
            if (settings.ls) {
                localStorage.settings   = JSON.stringify(settings);
            }
            //Persistance won't works if localsotrage is not enabled
            window.location.reload();
        }
    };


    interface.setMaxPoints = function (nbPoints) {
        var max = parseInt(nbPoints);
        if (typeof max === "number" && max > 0) {
            settings.maxMarker = max;
            if (settings.ls) {
                localStorage.settings = JSON.stringify(settings);
            }
        }
    };

    interface.setCanvas = function (canvas) {
            settings.canvas = (canvas == true);
            if (settings.ls) {
                localStorage.settings = JSON.stringify(settings);
            }
            window.location.reload();
    };

    var locale = new Locale(navigator.language || "fr");
    locale.localize();
    var content = {
        markerCount : 0,
        stations    : [],
        position    : null,
        geoloc      : false,
        geolocMarker: null,
        map         : null
    };



    ///////////////////////////////////////////////
    //              State Controllers            //
    ///////////////////////////////////////////////



    var CanvasController = {
        updateIcon: function () {
            this.marker = new L.CircleMarker([this.latitude, this.longitude], {color:this.getColor()});
            if (content.map) {
                this.marker.addTo(content.map);
            }
        },
        onMoveEnd: function () {
            settings.startPosition = [content.map.getCenter().lat, content.map.getCenter().lng]
        }
    }


    var DivController = {
        updateIcon: function () {
            var markerIcon = L.divIcon(
                {
                    className:  'icon ' + this.availability,
                    iconSize:   null,
                    html:       "<p class=\"text\">" + (this.lastUpdated ? ( (this.available_bikes || '0') + '-' + (this.available_bike_stands || '0') ) : this.number) + "</p>"
                }
            );
            this.marker = new L.marker([this.latitude, this.longitude],{icon: markerIcon, opacity: 0.8});
        },
        onMoveEnd: function () {
            var mapBounds = content.map.getBounds();
            for (var i = 0; i < content.stations.length; i++) {
                var m = content.stations[i];
                if (mapBounds.contains(m.getLatLng())) {
                    if (!m.isDisplayed() && (settings.maxMarker <= 0 || content.markerCount < settings.maxMarker)) {
                        m.addTo(content.map);
                        content.markerCount++;
                    }
                } else if (m.isDisplayed()) {
                    m.remove();
                    content.markerCount--;
                }
            }
            settings.startPosition = [content.map.getCenter().lat, content.map.getCenter().lng]
        }
    }


    var ImgController= {
        updateIcon: function () {
            var markerIcon = L.Icon({
                    iconUrl : "images/marker-icon.png"
                });
            this.marker = new L.marker([this.latitude, this.longitude],{/*icon: markerIcon,*/ opacity: 0.8});
            if (content.map) {
                this.marker.addTo(content.map);
            }
        },
        onMoveEnd: function () {
            settings.startPosition = [content.map.getCenter().lat, content.map.getCenter().lng]
        }
    }

    var ctrl = DivController;

    //////////////////////////////////////////
    //          Helpers                     //
    //////////////////////////////////////////

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


    //////////////////////////////////////////////
    //          Station object                  //
    //////////////////////////////////////////////


    var Station = function (data) {

        this.lastUpdated = data.last_update || 0;
        this.number = data.number;
        this.name = data.name.replace(/^[0-9]* ?[_\-] ?/, "").replace(/_/g," ").toLowerCase().capitalize();
        this.address = data.address;
        if (data.position) {
            this.longitude = data.position.lng;
            this.latitude = data.position.lat;
        } else  {http://commons.wikimedia.org/wiki/File:France_relief_location_map.jpg
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
                container.textContent += ": " + 
                    (that.available_bikes || '0') + 
                    " " + locale.getString("bikes") + ", " + 
                    (that.available_bike_stands || '0') + 
                    " " + locale.getString("stands") + ".";
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
        ctrl.updateIcon.apply(this);
    };


    var addMyIcon = function (icone, action) {
        var div = document.createElement('div');
        div.classList.add('controlIcon');
        div.addEventListener("click", action)
        var font = document.createElement('i');
        font.classList.add(icone);
        div.appendChild(font);
        return div;
    };

    var geoloc = function () {
        var position = function (position) {
            content.geolocMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
            content.geolocMarker.addTo(content.map);
            content.geolocMarker.update();
            content.map.setView([position.coords.latitude, position.coords.longitude], 16);
        };

        if (content.geoloc) {
            content.geolocMarker.setLatLng([0, 0]);
            content.geolocMarker.update();
            content.geoloc = false;
            content.geolocMarker.addTo(content.map);
            navigator.geolocation.clearWatch(content.geolocId);
        } else {
            content.geoloc = true;
            window.navigator.geolocation.getCurrentPosition(position);
            content.geolocId = window.navigator.geolocation.watchPosition(position);
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

    var getAllStationDataCB = function (city) {
        if (this.readyState === 4) {
            if (this.status === 200) {
                var completeData = JSON.parse(this.responseText);
                if (completeData) {
                    for (i in completeData) {
                        var station = new Station(completeData[i]);;
                        content.stations.push(station);
                    }
                } else {
                    console.log("Error in API response: url =" + ", response = " + this.responseText);
                }
            } else {
                for (i in data[settings.city]) {
                    var station = new Station(data[settings.city][i]);
                    content.stations.push(station);
                }       
            }
        ctrl.onMoveEnd();
        }
    }


    /////////////////////////////////////
    //              Main.c             //
    /////////////////////////////////////

    interface.main = function () {

        //setting map background
        var tilesUrl = 'tiles/' +  settings.city + '/{z}/{x}/{y}.png';
        var tilesLayer = new L.TileLayer(tilesUrl, {minZoom: 12, maxZoom: 16, attribution: "Data \u00a9 OSM ctrbs, ODL"});

        content.map = new L.Map('map');
        content.map.addLayer(tilesLayer);
        content.map.setView(settings.startPosition, 15);

        //setting position marker
        content.geolocMarker = L.marker(
            [0, 0],
            {title:  geoloc }
        );
        var geolocIcon = L.divIcon(
            {
                className:  'geoloc',
                iconSize:   [15, 15]
            }
        );
        content.geolocMarker.setIcon(geolocIcon);


        //setting stations marker and data
        var url = settings.baseWS + "stations?&apiKey=" + settings.key + "&contract=" + settings.city;
        xhr(url, getAllStationDataCB);

        //setting controls
        var control = L.control({position: 'topright'});

        control.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'buttons');
            div.appendChild(addMyIcon('icon-cog', displaySettings));
            div.appendChild(addMyIcon('icon-repeat', window.location.reload));
            if (navigator.geolocation !== 'undefined') {
                div.appendChild(addMyIcon('icon-map-marker', geoloc));
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

        info.addTo(content.map);
        control.addTo(content.map);
        content.map.on('moveend', ctrl.onMoveEnd);
        window.addEventListener('beforeunload', function () {localStorage.settings = JSON.stringify(settings);}, false)

        //setting setting panel states
        var selector = document.getElementById("selectCity");
        for (var i = 0; i < selector.length;i++) {
            if (selector.options[i].value === settings.city) {
                selector.selectedIndex = i;
                break;
            }
        }
        var selector = document.getElementById("maxpoint").value = settings.maxMarker;
        var selector = document.getElementById("canvas").value = settings.canvas;

    };


    return interface;
}();

bikeSharing.main();