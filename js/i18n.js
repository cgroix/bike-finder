var Locale = function (loc) {
    var locale = loc || "en";
    var that = {};

    var dic = {
        "bikes"     : {
                        "fr"   : "vélos",
                        "en-US"   : "bikes",
                        "es"   : "bicis"
                    },
        "stands"    : {
                        "fr"   : "emplacements",
                        "en-US"   : "stands",
                        "es"   : "aparcamientos"
                    },
        "title"     : {
                        "fr"   : "Vélos partagés",
                        "en-US"   : "Bike sharing",
                        "es"   : "Bicicletas compartidas"
                    },
        "cityChoice"    : {
                        "fr"   : "Sélectionner votre ville",
                        "en-US"   : "Choose your city",
                        "es"   : "Elige su ciudad"
                    },
        "settingCanvas" : {
                        "fr"   : "Canvas: ",
                        "en-US"   : "Canvas: ",
                        "es"   : "Canvas: "
                    },
        "settingMaxPoint" : {
                        "fr"   : "Maximum de point: ",
                        "en-US"   : "Max points: ",
                        "es"   : "Maximum de puntos: "
                    },
        "contribute" : {
                        "fr"   : "Contribuez à ce projet sur ",
                        "en-US"   : "Contribute to this project at ",
                        "es"   : "Contribuye a este proyecto en "
                    },
        };

    that.localize = function () {
        for (var key in dic) {
            var set = document.querySelectorAll(".i18n-" + key);
            for (var i=0; i<set.length;i++) {
                if (dic[key][locale]) {
                    set[i].textContent = dic[key][locale];
                }
            }
        }
    };

    that.setLocale = function (loc) {
        this.locale = loc;
    };

    that.getString = function(key) {
        if (dic[key]) {
            return dic[key][locale] || "Foo";
        } else {
            return "Key not found";
        }
    };

    return that;
};